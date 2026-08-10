import yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import type {
  ApiSpec,
  Endpoint,
  HttpMethod,
  ApiTag,
  SchemaComponent,
  SchemaProperty,
  SecurityScheme,
  EndpointParameter,
  ResponseDefinition,
  ContentType,
  EndpointExample,
  RequestBodyDefinition,
} from '@modern-api-studio/types';

// ─── OpenAPI / Swagger document shapes (only the fields the importer reads) ─

type JsonObject = Record<string, unknown>;

interface SchemaObj {
  type?: string;
  format?: string;
  description?: string;
  nullable?: boolean;
  example?: unknown;
  enum?: unknown[];
  properties?: Record<string, SchemaObj | undefined>;
  required?: string[];
  items?: SchemaObj;
  $ref?: string;
}

interface ParameterObj {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: SchemaObj;
  $ref?: string;
}

interface ExampleObj {
  summary?: string;
  value?: unknown;
}

interface MediaTypeObj {
  schema?: SchemaObj;
  example?: unknown;
  examples?: Record<string, ExampleObj | undefined>;
}

interface RequestBodyObj {
  required?: boolean;
  description?: string;
  content?: Record<string, MediaTypeObj | undefined>;
}

interface ResponseObj {
  description?: string;
  content?: Record<string, MediaTypeObj | undefined>;
  example?: unknown;
}

type SecurityRequirementObj = Record<string, string[]>;

interface OperationObj {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: SecurityRequirementObj[];
  parameters?: ParameterObj[];
  requestBody?: RequestBodyObj;
  responses?: Record<string, ResponseObj | undefined>;
}

interface PathItemObj extends JsonObject {
  parameters?: ParameterObj[];
  get?: OperationObj;
  post?: OperationObj;
  put?: OperationObj;
  patch?: OperationObj;
  delete?: OperationObj;
  options?: OperationObj;
  head?: OperationObj;
  trace?: OperationObj;
}

interface SecuritySchemeObj {
  type?: string;
  description?: string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  flows?: unknown;
}

interface TagObj {
  name?: string;
  description?: string;
}

interface ServerObj {
  url?: string;
  description?: string;
}

interface ComponentsObj {
  schemas?: Record<string, SchemaObj | undefined>;
  securitySchemes?: Record<string, SecuritySchemeObj | undefined>;
}

interface OpenApiDoc extends JsonObject {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: ServerObj[];
  tags?: TagObj[];
  paths?: Record<string, PathItemObj | undefined>;
  components?: ComponentsObj;
  security?: SecurityRequirementObj[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  definitions?: Record<string, SchemaObj | undefined>;
  securityDefinitions?: Record<string, SecuritySchemeObj | undefined>;
}

// ─── Safe accessors (normalise unknown → expected shape) ─────────────────────

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function asObj(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function asSchema(value: unknown): SchemaObj {
  return isObject(value) ? value as SchemaObj : {};
}

function asStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStrArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'] as const;
type ValidSchemaType = typeof VALID_SCHEMA_TYPES[number];

function toSchemaType(raw: unknown): ValidSchemaType {
  if (VALID_SCHEMA_TYPES.includes(raw as ValidSchemaType)) return raw as ValidSchemaType;
  return 'string';
}

/** Resolve a JSON-pointer $ref within the same document */
function resolveRef(ref: string, doc: unknown): unknown {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let cur: unknown = doc;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = (cur as JsonObject)[decodeURIComponent(p.replace(/~1/g, '/').replace(/~0/g, '~'))];
  }
  return cur;
}

/** Extract the schema name from a $ref string */
function refName(ref: string): string {
  return ref.split('/').pop() ?? ref;
}

function toSchemaProps(
  properties: Record<string, SchemaObj | undefined> = {},
  required: string[] = [],
  doc?: unknown,
): SchemaProperty[] {
  return Object.entries(properties).map(([name, def]) => {
    // Resolve inline $ref
    const resolved = def?.$ref && doc ? asSchema(resolveRef(def.$ref, doc) ?? def) : (def ?? {});

    const prop: SchemaProperty = {
      id: uuidv4(),
      name,
      type: toSchemaType(resolved.type),
      required: required.includes(name),
      nullable: resolved.nullable ?? false,
      description: resolved.description,
      format: resolved.format,
      example: resolved.example,
      enum: Array.isArray(resolved.enum) ? resolved.enum.map(String) : undefined,
      ref: def?.$ref ? refName(def.$ref) : undefined,
    };

    // Nested object
    if (resolved.properties) {
      prop.properties = toSchemaProps(resolved.properties, resolved.required ?? [], doc);
    }

    // Array items
    if (resolved.items) {
      const itemsDef = resolved.items.$ref && doc
        ? asSchema(resolveRef(resolved.items.$ref, doc) ?? resolved.items)
        : resolved.items;
      prop.items = {
        id: uuidv4(),
        name: 'item',
        type: toSchemaType(itemsDef.type),
        required: false,
        nullable: false,
        ref: resolved.items.$ref ? refName(resolved.items.$ref) : undefined,
      };
    }

    return prop;
  });
}

/** Parse a raw schema node (possibly a $ref) into SchemaProperty[] */
function parseSchemaNode(schema: unknown, doc: unknown): SchemaProperty[] {
  if (!schema) return [];
  const node = asSchema(schema);

  // Top-level $ref
  if (node.$ref) {
    const resolved = resolveRef(node.$ref, doc);
    if (!resolved) return [];
    return toSchemaProps(asObj(resolved).properties as Record<string, SchemaObj | undefined> ?? {}, asStrArray(asObj(resolved).required), doc);
  }

  // Array type with items
  if (node.type === 'array' && node.items) {
    const itemsDef = node.items.$ref ? asSchema(resolveRef(node.items.$ref, doc) ?? node.items) : node.items;
    const itemProp: SchemaProperty = {
      id: uuidv4(),
      name: 'items',
      type: toSchemaType(itemsDef.type ?? 'object'),
      required: false,
      nullable: false,
      description: itemsDef.description,
      ref: node.items.$ref ? refName(node.items.$ref) : undefined,
    };
    if (itemsDef.properties) {
      itemProp.properties = toSchemaProps(itemsDef.properties, itemsDef.required ?? [], doc);
    }
    return [itemProp];
  }

  return toSchemaProps(node.properties ?? {}, node.required ?? [], doc);
}

/** Serialize an arbitrary value to a JSON string example */
function toJsonString(val: unknown): string {
  try { return JSON.stringify(val, null, 2); } catch { return '{}'; }
}

/** Extract named examples from OpenAPI `examples` map or single `example` */
function parseExamples(
  mediaObj: MediaTypeObj | undefined,
): EndpointExample[] {
  if (!mediaObj) return [];

  // `examples` map (OAS 3)
  if (mediaObj.examples && typeof mediaObj.examples === 'object') {
    return Object.entries(mediaObj.examples).map(([name, ex]) => ({
      id: uuidv4(),
      name,
      summary: ex?.summary,
      value: typeof ex?.value === 'string' ? ex.value : toJsonString(ex?.value),
    }));
  }

  // Single `example`
  if (mediaObj.example !== undefined) {
    return [{
      id: uuidv4(),
      name: 'example',
      value: typeof mediaObj.example === 'string' ? mediaObj.example : toJsonString(mediaObj.example),
    }];
  }

  // Example from schema level
  if (mediaObj.schema?.example !== undefined) {
    return [{
      id: uuidv4(),
      name: 'example',
      value: typeof mediaObj.schema.example === 'string'
        ? mediaObj.schema.example
        : toJsonString(mediaObj.schema.example),
    }];
  }

  return [];
}

function parseSchemas(components: ComponentsObj = {}, doc?: unknown): SchemaComponent[] {
  const schemas = components.schemas ?? {};
  return Object.entries(schemas).map(([name, def]) => ({
    id: uuidv4(),
    name,
    description: def?.description,
    properties: toSchemaProps(def?.properties ?? {}, def?.required ?? [], doc),
  }));
}

function parseSecuritySchemes(
  components: ComponentsObj = {},
): SecurityScheme[] {
  const schemes = components.securitySchemes ?? {};
  return Object.entries(schemes).map(([name, def]) => {
    const base: Pick<SecurityScheme, 'id' | 'name' | 'description'> = {
      id: uuidv4(),
      name,
      description: def?.description,
    };

    if (def?.type === 'http') {
      if (def.scheme === 'basic') return { ...base, type: 'basic' as const };
      return { ...base, type: 'bearer' as const, bearerFormat: def.bearerFormat };
    }
    if (def?.type === 'apiKey') {
      return {
        ...base,
        type: 'apiKey' as const,
        in: (def.in ?? 'header') as 'header' | 'query' | 'cookie',
        keyName: def.name,
      };
    }
    if (def?.type === 'oauth2') {
      return { ...base, type: 'oauth2' as const, flows: def.flows as SecurityScheme['flows'] };
    }
    return { ...base, type: 'bearer' as const };
  });
}

function parseTags(rawTags: unknown[] = []): ApiTag[] {
  return rawTags.map((t) => {
    const tag = asObj(t);
    return {
      id: uuidv4(),
      name: asStr(tag.name) ?? 'Unnamed',
      description: asStr(tag.description),
    };
  });
}

function parseParameters(params: unknown[] = []): EndpointParameter[] {
  return params
    .filter((p): p is JsonObject => isObject(p) && !p.$ref)
    .map((p) => ({
      id: uuidv4(),
      name: asStr(p.name) ?? '',
      in: (p.in ?? 'query') as EndpointParameter['in'],
      required: asBool(p.required),
      description: asStr(p.description),
      schema: {
        type: toSchemaType(asObj(p.schema).type),
        format: asStr(asObj(p.schema).format),
        example: asObj(p.schema).example,
        enum: Array.isArray(asObj(p.schema).enum) ? (asObj(p.schema).enum as unknown[]).map(String) : undefined,
        items: asObj(p.schema).items ? {
          type: asStr(asObj(asObj(p.schema).items).type) ?? 'string',
        } : undefined,
      },
    }));
}

const CONTENT_TYPES: ContentType[] = [
  'application/json',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
];

function toContentType(raw: string): ContentType {
  return (CONTENT_TYPES.find((ct) => raw.startsWith(ct)) ?? 'application/json');
}

/** Parse requestBody fully: schema, contentType, examples, rawJson, description */
function parseRequestBody(requestBody: RequestBodyObj | undefined, doc: unknown): RequestBodyDefinition | undefined {
  if (!requestBody?.content) return undefined;

  const content = requestBody.content;
  const mediaTypeKey = Object.keys(content)[0];
  if (!mediaTypeKey) return undefined;

  const mediaObj = content[mediaTypeKey];
  const schema = mediaObj?.schema;
  const examples = parseExamples(mediaObj);

  // Determine mode
  const isRef = !!schema?.$ref;
  const schemaProps = parseSchemaNode(schema, doc);

  // Build rawJson from example if available
  let rawJson: string | undefined;
  if (examples.length > 0) {
    rawJson = examples[0].value;
  } else if (schema?.example !== undefined) {
    rawJson = toJsonString(schema.example);
  }

  return {
    required: requestBody.required ?? false,
    description: requestBody.description,
    contentType: toContentType(mediaTypeKey),
    mode: isRef ? 'ref' : (rawJson ? 'raw' : 'visual'),
    ref: isRef ? refName(schema.$ref as string) : undefined,
    schema: schemaProps,
    rawJson,
    examples: examples.length > 0 ? examples : undefined,
  };
}

/** Parse responses fully: statusCode, description, contentType, schema, examples, rawJson */
function parseResponses(responses: Record<string, ResponseObj | undefined> = {}, doc: unknown): ResponseDefinition[] {
  return Object.entries(responses).map(([code, def]) => {
    if (!def) {
      return { id: uuidv4(), statusCode: code, description: '' };
    }

    // Find content
    const content = def.content ?? {};
    const mediaTypeKey = Object.keys(content)[0];
    const mediaObj = mediaTypeKey ? content[mediaTypeKey] : null;
    const schema = mediaObj?.schema;

    const examples = parseExamples(mediaObj ?? undefined);
    const schemaProps = schema ? parseSchemaNode(schema, doc) : undefined;
    const isRef = !!schema?.$ref;

    // Build rawJson from example
    let rawJson: string | undefined;
    if (examples.length > 0) {
      rawJson = examples[0].value;
    } else if (def.example !== undefined) {
      rawJson = toJsonString(def.example);
    }

    return {
      id: uuidv4(),
      statusCode: code,
      description: asStr(def.description) ?? '',
      contentType: mediaTypeKey ? mediaTypeKey : undefined,
      mode: isRef ? 'ref' : (rawJson ? 'raw' : (schemaProps && schemaProps.length > 0 ? 'visual' : undefined)),
      ref: isRef ? refName(schema.$ref as string) : undefined,
      schema: schemaProps && schemaProps.length > 0 ? schemaProps : [],
      rawJson,
      examples: examples.length > 0 ? examples : undefined,
    };
  });
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ALL_METHODS = [...HTTP_METHODS, 'OPTIONS', 'HEAD', 'TRACE'] as const;

function parseEndpoints(
  paths: Record<string, PathItemObj | undefined> = {},
  allTagNames: string[],
  doc: unknown,
): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const pathParams = parseParameters(pathItem.parameters ?? []);

    for (const rawMethod of ALL_METHODS) {
      const op = pathItem[rawMethod.toLowerCase()] as OperationObj | undefined;
      if (!op) continue;

      const method = rawMethod.toUpperCase() as HttpMethod;
      if (!HTTP_METHODS.includes(method)) continue;

      const opParams = parseParameters(op.parameters ?? []);
      const merged: EndpointParameter[] = [
        ...pathParams.filter(
          (pp) => !opParams.find((op2) => op2.name === pp.name && op2.in === pp.in),
        ),
        ...opParams,
      ];

      const securityNames = (op.security ?? []).flatMap(
        (s) => Object.keys(s),
      );
      const tagNames = (op.tags ?? []).filter((t) =>
        allTagNames.includes(t),
      );

      const ep: Endpoint = {
        id: uuidv4(),
        path,
        method,
        summary: op.summary ?? '',
        description: op.description,
        operationId: op.operationId,
        tags: tagNames,
        deprecated: op.deprecated ?? false,
        security: securityNames,
        parameters: merged,
        requestBody: parseRequestBody(op.requestBody, doc),
        responses: parseResponses(op.responses ?? {}, doc),
      };

      endpoints.push(ep);
    }
  }

  return endpoints;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ImportResult {
  spec: ApiSpec;
  warnings: string[];
}

/**
 * Parse an OpenAPI 3.x or Swagger 2.x document (YAML or JSON string)
 * into the internal ApiSpec format used by the store.
 *
 * Now fully imports:
 * - Endpoint parameters (path, query, header, cookie)
 * - Request body: schema, contentType, examples, rawJson, $ref resolution, description
 * - Responses: schema, contentType, examples, rawJson, $ref resolution
 * - Components: schemas (with nested properties), security schemes
 * - Tags, servers, global security
 */
export function parseOpenApiToSpec(raw: string): ImportResult {
  const warnings: string[] = [];

  let doc: OpenApiDoc;
  try {
    const loaded = yaml.load(raw);
    if (!isObject(loaded)) {
      throw new Error('File does not contain a valid YAML/JSON object.');
    }
    doc = loaded as OpenApiDoc;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message === 'File does not contain a valid YAML/JSON object.') throw e;
    throw new Error(`Failed to parse file: ${message}`, { cause: e });
  }

  const isSwagger2 = !!doc.swagger;
  if (!doc.openapi && !doc.swagger) {
    warnings.push(
      'No "openapi" or "swagger" version field found — treating as OpenAPI 3.',
    );
  }

  const info = doc.info ?? {};
  const tags = parseTags(doc.tags ?? []);
  const allTagNames = tags.map((t) => t.name);

  // Build servers list
  const servers: ApiSpec['servers'] = [];
  if (isSwagger2) {
    const scheme = (doc.schemes ?? ['https'])[0];
    const host = doc.host ?? 'api.example.com';
    const basePath = doc.basePath ?? '/';
    servers.push({ url: `${scheme}://${host}${basePath}`, description: 'Server' });
  } else {
    for (const s of doc.servers ?? []) {
      servers.push({ url: s.url ?? '', description: s.description });
    }
  }
  if (servers.length === 0) {
    servers.push({ url: 'https://api.example.com', description: 'Server' });
  }

  const components = doc.components ?? {};
  const schemas = parseSchemas(components, doc);
  const securitySchemes = parseSecuritySchemes(components);

  // Swagger 2 securityDefinitions
  if (isSwagger2 && doc.securityDefinitions) {
    const sw2 = parseSecuritySchemes({ securitySchemes: doc.securityDefinitions });
    securitySchemes.push(...sw2);
  }

  const globalSecurity = (doc.security ?? []).flatMap(
    (s) => Object.keys(s),
  );

  // Swagger 2: convert definitions → components.schemas
  if (isSwagger2 && doc.definitions) {
    const defSchemas = parseSchemas({ schemas: doc.definitions }, doc);
    schemas.push(...defSchemas);
  }

  const endpoints = parseEndpoints(doc.paths ?? {}, allTagNames, doc);

  if (endpoints.length === 0) {
    warnings.push('No endpoints (paths) were found in the spec.');
  }

  // Count how many responses/bodies actually got schemas
  const withResponseSchema = endpoints.filter((e) =>
    e.responses.some((r) => r.schema && r.schema.length > 0),
  ).length;
  if (endpoints.length > 0 && withResponseSchema === 0) {
    warnings.push('No response schemas were detected — responses may use inline examples only.');
  }

  const spec: ApiSpec = {
    id: uuidv4(),
    info: {
      title: String(info.title ?? 'Imported API'),
      version: String(info.version ?? '1.0.0'),
      description: info.description,
    },
    servers,
    tags,
    endpoints,
    components: { schemas, securitySchemes },
    globalSecurity,
    openApiVersion: isSwagger2 ? 'swagger2' : 'openapi3',
  };

  return { spec, warnings };
}
