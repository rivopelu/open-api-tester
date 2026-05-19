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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array', 'null'] as const;
type ValidSchemaType = typeof VALID_SCHEMA_TYPES[number];

function toSchemaType(raw: unknown): ValidSchemaType {
  if (VALID_SCHEMA_TYPES.includes(raw as ValidSchemaType)) return raw as ValidSchemaType;
  return 'string';
}

/** Resolve a JSON-pointer $ref within the same document */
function resolveRef(ref: string, doc: any): any {
  if (!ref || !ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let cur = doc;
  for (const p of parts) {
    if (cur == null) return null;
    cur = cur[decodeURIComponent(p.replace(/~1/g, '/').replace(/~0/g, '~'))];
  }
  return cur;
}

/** Extract the schema name from a $ref string */
function refName(ref: string): string {
  return ref.split('/').pop() ?? ref;
}

function toSchemaProps(
  properties: Record<string, any> = {},
  required: string[] = [],
  doc?: any,
): SchemaProperty[] {
  return Object.entries(properties).map(([name, def]) => {
    // Resolve inline $ref
    const resolved = def.$ref && doc ? resolveRef(def.$ref, doc) ?? def : def;

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
      ref: def.$ref ? refName(def.$ref) : undefined,
    };

    // Nested object
    if (resolved.properties) {
      prop.properties = toSchemaProps(resolved.properties, resolved.required ?? [], doc);
    }

    // Array items
    if (resolved.items) {
      const itemsDef = resolved.items.$ref && doc
        ? resolveRef(resolved.items.$ref, doc) ?? resolved.items
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
function parseSchemaNode(schema: any, doc: any): SchemaProperty[] {
  if (!schema) return [];

  // Top-level $ref
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, doc);
    if (!resolved) return [];
    return toSchemaProps(resolved.properties ?? {}, resolved.required ?? [], doc);
  }

  // Array type with items
  if (schema.type === 'array' && schema.items) {
    const itemsDef = schema.items.$ref ? resolveRef(schema.items.$ref, doc) ?? schema.items : schema.items;
    const itemProp: SchemaProperty = {
      id: uuidv4(),
      name: 'items',
      type: toSchemaType(itemsDef.type ?? 'object'),
      required: false,
      nullable: false,
      description: itemsDef.description,
      ref: schema.items.$ref ? refName(schema.items.$ref) : undefined,
    };
    if (itemsDef.properties) {
      itemProp.properties = toSchemaProps(itemsDef.properties, itemsDef.required ?? [], doc);
    }
    return [itemProp];
  }

  return toSchemaProps(schema.properties ?? {}, schema.required ?? [], doc);
}

/** Serialize an arbitrary value to a JSON string example */
function toJsonString(val: any): string {
  try { return JSON.stringify(val, null, 2); } catch { return '{}'; }
}

/** Extract named examples from OpenAPI `examples` map or single `example` */
function parseExamples(
  mediaObj: any,
): EndpointExample[] {
  if (!mediaObj) return [];

  // `examples` map (OAS 3)
  if (mediaObj.examples && typeof mediaObj.examples === 'object') {
    return Object.entries(mediaObj.examples).map(([name, ex]: [string, any]) => ({
      id: uuidv4(),
      name,
      summary: ex.summary,
      value: typeof ex.value === 'string' ? ex.value : toJsonString(ex.value),
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

function parseSchemas(components: Record<string, any> = {}, doc?: any): SchemaComponent[] {
  const schemas = components.schemas ?? {};
  return Object.entries(schemas).map(([name, def]: [string, any]) => ({
    id: uuidv4(),
    name,
    description: def.description,
    properties: toSchemaProps(def.properties ?? {}, def.required ?? [], doc),
  }));
}

function parseSecuritySchemes(
  components: Record<string, any> = {},
): SecurityScheme[] {
  const schemes = components.securitySchemes ?? {};
  return Object.entries(schemes).map(([name, def]: [string, any]) => {
    const base: Pick<SecurityScheme, 'id' | 'name' | 'description'> = {
      id: uuidv4(),
      name,
      description: def.description,
    };

    if (def.type === 'http') {
      if (def.scheme === 'basic') return { ...base, type: 'basic' as const };
      return { ...base, type: 'bearer' as const, bearerFormat: def.bearerFormat };
    }
    if (def.type === 'apiKey') {
      return {
        ...base,
        type: 'apiKey' as const,
        in: (def.in ?? 'header') as 'header' | 'query' | 'cookie',
        keyName: def.name,
      };
    }
    if (def.type === 'oauth2') {
      return { ...base, type: 'oauth2' as const, flows: def.flows };
    }
    return { ...base, type: 'bearer' as const };
  });
}

function parseTags(rawTags: any[] = []): ApiTag[] {
  return rawTags.map((t) => ({
    id: uuidv4(),
    name: String(t.name ?? 'Unnamed'),
    description: t.description,
  }));
}

function parseParameters(params: any[] = [], doc?: any): EndpointParameter[] {
  return params
    .filter((p) => p && typeof p === 'object' && !p.$ref)
    .map((p) => ({
      id: uuidv4(),
      name: String(p.name ?? ''),
      in: (p.in ?? 'query') as EndpointParameter['in'],
      required: p.required ?? false,
      description: p.description,
      schema: {
        type: toSchemaType(p.schema?.type),
        format: p.schema?.format,
        example: p.schema?.example,
        enum: Array.isArray(p.schema?.enum) ? p.schema.enum.map(String) : undefined,
        items: p.schema?.items ? {
          type: String(p.schema.items.type ?? 'string'),
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
function parseRequestBody(requestBody: any, doc: any): RequestBodyDefinition | undefined {
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
    ref: isRef ? refName(schema.$ref) : undefined,
    schema: schemaProps,
    rawJson,
    examples: examples.length > 0 ? examples : undefined,
  };
}

/** Parse responses fully: statusCode, description, contentType, schema, examples, rawJson */
function parseResponses(responses: Record<string, any> = {}, doc: any): ResponseDefinition[] {
  return Object.entries(responses).map(([code, def]: [string, any]) => {
    if (!def) {
      return { id: uuidv4(), statusCode: code, description: '' };
    }

    // Find content
    const content = def.content ?? {};
    const mediaTypeKey = Object.keys(content)[0];
    const mediaObj = mediaTypeKey ? content[mediaTypeKey] : null;
    const schema = mediaObj?.schema;

    const examples = parseExamples(mediaObj ?? {});
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
      description: String(def.description ?? ''),
      contentType: mediaTypeKey ? mediaTypeKey : undefined,
      mode: isRef ? 'ref' : (rawJson ? 'raw' : (schemaProps && schemaProps.length > 0 ? 'visual' : undefined)),
      ref: isRef ? refName(schema.$ref) : undefined,
      schema: schemaProps && schemaProps.length > 0 ? schemaProps : [],
      rawJson,
      examples: examples.length > 0 ? examples : undefined,
    };
  });
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ALL_METHODS = [...HTTP_METHODS, 'OPTIONS', 'HEAD', 'TRACE'] as const;

function parseEndpoints(
  paths: Record<string, any> = {},
  allTagNames: string[],
  doc: any,
): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    const pathParams = parseParameters(pathItem.parameters ?? [], doc);

    for (const rawMethod of ALL_METHODS) {
      const op = pathItem[rawMethod.toLowerCase()];
      if (!op) continue;

      const method = rawMethod.toUpperCase() as HttpMethod;
      if (!HTTP_METHODS.includes(method)) continue;

      const opParams = parseParameters(op.parameters ?? [], doc);
      const merged: EndpointParameter[] = [
        ...pathParams.filter(
          (pp) => !opParams.find((op2) => op2.name === pp.name && op2.in === pp.in),
        ),
        ...opParams,
      ];

      const securityNames = (op.security ?? []).flatMap(
        (s: Record<string, any>) => Object.keys(s),
      );
      const tagNames = (op.tags ?? []).filter((t: string) =>
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

  let doc: any;
  try {
    doc = yaml.load(raw);
  } catch (e) {
    throw new Error(`Failed to parse file: ${(e as Error).message}`);
  }

  if (!doc || typeof doc !== 'object') {
    throw new Error('File does not contain a valid YAML/JSON object.');
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
      servers.push({ url: s.url, description: s.description });
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
    (s: Record<string, any>) => Object.keys(s),
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
