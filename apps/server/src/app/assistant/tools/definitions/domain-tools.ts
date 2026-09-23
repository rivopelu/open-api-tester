import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type {
  EndpointAuthConfig,
  EndpointExample,
  EndpointParameter,
  HttpMethod,
  LiveEditOp,
  LiveEditPatch,
  RequestBodyDefinition,
  ResponseDefinition,
} from '@modern-api-studio/types'
import { EndpointFolderService } from '../../../endpoint-folders/service/endpoint-folder.service'
import { EndpointRepository } from '../../../endpoints/repository/endpoint.repository'
import { EndpointService } from '../../../endpoints/service/endpoint.service'
import { ProjectRepository } from '../../../projects/repository/project.repository'
import { ProjectService } from '../../../projects/service/project.service'
import { collectMockExamples, resolveMock } from '../../../mock/service/mock.service'
import type { EndpointItem } from '../../../endpoints/service/endpoint.service'
import type { DomainToolDefinition } from '../types/tool.types'

const projectRepository = new ProjectRepository()
const projectService = new ProjectService()
const endpointRepository = new EndpointRepository()
const endpointService = new EndpointService()
const folderService = new EndpointFolderService()

export function defineTool<TSchema extends z.ZodRawShape, TResult = unknown>(
  tool: DomainToolDefinition<TSchema, TResult>,
): DomainToolDefinition<TSchema, TResult> {
  return tool
}

// ── Live edit helpers (chat mode: the client types these ops into the form) ──
const ROW_SECTIONS = ['path', 'query', 'header'] as const
const PARAM_LOCATIONS = ['path', 'query', 'header', 'cookie'] as const

type Json = Record<string, unknown>
const isRecord = (value: unknown): value is Json =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function toJsonText(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  return value === undefined || value === null ? '' : JSON.stringify(value, null, 2)
}

function normalizeParameters(raw: unknown): EndpointParameter[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isRecord).flatMap((param): EndpointParameter[] => {
    if (typeof param.name !== 'string' || !param.name) return []
    const location = PARAM_LOCATIONS.find((loc) => loc === param.in) ?? 'query'
    const schema = isRecord(param.schema) ? param.schema : {}
    return [
      {
        id: typeof param.id === 'string' ? param.id : randomUUID(),
        name: param.name,
        in: location,
        required: Boolean(param.required ?? location === 'path'),
        description: typeof param.description === 'string' ? param.description : undefined,
        schema: {
          ...schema,
          type: (typeof schema.type === 'string'
            ? schema.type
            : 'string') as EndpointParameter['schema']['type'],
          example: schema.example ?? param.example,
        },
      },
    ]
  })
}

/** Sample JSON from an OpenAPI JSON schema object (`{ properties: {...} }`). */
function sampleFromJsonSchema(schema: Json): unknown {
  if (schema.example !== undefined) return schema.example
  if (isRecord(schema.properties)) {
    return Object.fromEntries(
      Object.entries(schema.properties).map(([key, prop]) => [
        key,
        isRecord(prop) ? sampleFromJsonSchema(prop) : null,
      ]),
    )
  }
  if (schema.type === 'array') {
    return [isRecord(schema.items) ? sampleFromJsonSchema(schema.items) : null]
  }
  if (schema.type === 'string') return ''
  if (schema.type === 'number' || schema.type === 'integer') return 0
  if (schema.type === 'boolean') return false
  return null
}

/** Accepts the studio shape or an OpenAPI requestBody and always yields `rawJson` for the Body tab. */
function normalizeRequestBody(
  raw: unknown,
  current?: RequestBodyDefinition,
): RequestBodyDefinition {
  const body = isRecord(raw) ? raw : {}
  const content = isRecord(body.content) ? body.content : undefined
  const json =
    content && isRecord(content['application/json']) ? content['application/json'] : undefined
  const jsonSchema = isRecord(body.schema)
    ? body.schema
    : json && isRecord(json.schema)
      ? json.schema
      : undefined
  const example =
    body.example ?? json?.example ?? (jsonSchema ? sampleFromJsonSchema(jsonSchema) : undefined)

  const rest = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== 'content' && key !== 'example'),
  ) as Partial<RequestBodyDefinition>
  return {
    ...current,
    ...rest,
    required: Boolean(body.required ?? current?.required ?? false),
    contentType: (typeof body.contentType === 'string'
      ? body.contentType
      : (current?.contentType ?? 'application/json')) as RequestBodyDefinition['contentType'],
    schema: Array.isArray(body.schema) ? body.schema : (current?.schema ?? []),
    rawJson:
      typeof body.rawJson === 'string'
        ? body.rawJson
        : example !== undefined
          ? toJsonText(example)
          : current?.rawJson,
  }
}

/** Merges an OpenAPI operation patch into the stored specData, normalizing what the form shows. */
function mergeSpec(current: Json, patch: Json | undefined): Json {
  if (!patch) return current
  const next: Json = { ...current, ...patch }
  if (patch.parameters !== undefined) next.parameters = normalizeParameters(patch.parameters)
  if (patch.requestBody !== undefined) {
    next.requestBody = normalizeRequestBody(
      patch.requestBody,
      current.requestBody as RequestBodyDefinition | undefined,
    )
  }
  return next
}

function specOps(current: Json, patch: Json | undefined, next: Json): LiveEditOp[] {
  if (!patch) return []
  const ops: LiveEditOp[] = []
  if (patch.parameters !== undefined) {
    const nextParams = (next.parameters as EndpointParameter[]) ?? []
    const currentParams = Array.isArray(current.parameters)
      ? (current.parameters as EndpointParameter[])
      : []
    for (const section of ROW_SECTIONS) {
      const rows = nextParams
        .filter((param) => param.in === section)
        .map((param) => ({ key: param.name, value: String(param.schema?.example ?? '') }))
      if (rows.length || currentParams.some((param) => param.in === section)) {
        ops.push({ kind: 'rows', section, rows })
      }
    }
  }
  if (patch.requestBody !== undefined) {
    ops.push({ kind: 'body', requestBody: next.requestBody as RequestBodyDefinition })
  }
  if (isRecord(patch.auth) && typeof patch.auth.type === 'string') {
    ops.push({ kind: 'auth', value: patch.auth as unknown as EndpointAuthConfig })
  }
  if (typeof patch.description === 'string') ops.push({ kind: 'docs', value: patch.description })
  if (Array.isArray(patch.responses)) {
    ops.push({ kind: 'responses', value: patch.responses as ResponseDefinition[] })
  }
  return ops
}

function headerOps(changes: {
  method?: HttpMethod
  path?: string
  summary?: string
}): LiveEditOp[] {
  const ops: LiveEditOp[] = []
  if (changes.method) ops.push({ kind: 'method', value: changes.method })
  if (changes.path !== undefined) ops.push({ kind: 'url', value: changes.path })
  if (changes.summary !== undefined) ops.push({ kind: 'summary', value: changes.summary })
  return ops
}

function endpointPatch(changes: {
  method?: HttpMethod
  path?: string
  summary?: string
  folderId?: string | null
  specData?: Json
}): LiveEditPatch {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as LiveEditPatch
}

/** Adds an example to the request body or a response status, creating the response when missing. */
function buildExampleContract(
  endpoint: EndpointItem,
  input: {
    scope: 'request' | 'response'
    responseStatus?: string
    name: string
    summary?: string
    value: unknown
  },
) {
  const spec = endpoint.specData
  const example: EndpointExample = {
    id: randomUUID(),
    name: input.name,
    summary: input.summary,
    value: toJsonText(input.value) || '{\n  \n}',
  }
  const requestBody = spec.requestBody as RequestBodyDefinition | undefined
  const responses = Array.isArray(spec.responses) ? (spec.responses as ResponseDefinition[]) : []

  if (input.scope === 'request') {
    return {
      example,
      responseId: undefined,
      requestBody: {
        required: requestBody?.required ?? false,
        contentType: requestBody?.contentType ?? 'application/json',
        schema: requestBody?.schema ?? [],
        ...requestBody,
        examples: [...(requestBody?.examples ?? []), example],
      } as RequestBodyDefinition,
      responses,
    }
  }

  if (!input.responseStatus) throw new Error('responseStatus is required for response examples')
  const existing = responses.find((item) => item.statusCode === input.responseStatus)
  const responseId = existing?.id ?? randomUUID()
  const nextResponses: ResponseDefinition[] = existing
    ? responses.map((item) =>
        item.id === existing.id ? { ...item, examples: [...(item.examples ?? []), example] } : item,
      )
    : [
        ...responses,
        {
          id: responseId,
          statusCode: input.responseStatus,
          description: 'Generated response',
          contentType: 'application/json',
          examples: [example],
        },
      ]
  return { example, responseId, requestBody, responses: nextResponses }
}

/** Fallback when the client cannot show a live edit: persist its final values directly. */
export async function persistLivePatch(endpointId: string, patch: LiveEditPatch) {
  return endpointService.update(endpointId, patch)
}

export const domainTools: DomainToolDefinition[] = [
  // ── Project Tools ──────────────────────────────────────────────────────────
  defineTool({
    name: 'list_projects',
    description:
      'List all active API projects including their ID, name, description, version, total endpoint count, and folder count.',
    inputSchema: z.object({}),
    readOnly: true,
    execute: async () => {
      const [projects, allEndpoints] = await Promise.all([
        projectRepository.findActive(),
        endpointRepository.findAllActive(),
      ])

      const endpointCountMap = new Map<string, number>()
      for (const ep of allEndpoints) {
        const current = endpointCountMap.get(ep.project_id) || 0
        endpointCountMap.set(ep.project_id, current + 1)
      }

      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        totalEndpoints: endpointCountMap.get(p.id) || 0,
        createdAt: p.created_date,
        updatedAt: p.updated_date,
      }))
    },
    formatSummary: (result) => `Found ${(result as unknown[]).length} active projects`,
  }),

  defineTool({
    name: 'get_project',
    description: 'Read detailed metadata of one active API project by its ID.',
    inputSchema: z.object({
      projectId: z.string().min(1).describe('The unique ID of the project'),
    }),
    readOnly: true,
    execute: async ({ projectId }) => {
      return projectRepository.findActiveById(projectId)
    },
    formatSummary: (result) => {
      const res = result as { name?: string } | null
      return res ? `Project '${res.name}' loaded` : 'Project not found'
    },
  }),

  defineTool({
    name: 'create_project',
    description: 'Create a new global API project.',
    inputSchema: z.object({
      name: z.string().trim().min(1).describe('The name of the project to create'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ name }) => `Create new project named "${name}"`,
    execute: async ({ name }, ctx) => {
      const created = await projectService.create({
        name,
        created_by: ctx.accountId || 'system',
      })
      ctx.onUiEffect?.({
        type: 'navigate',
        projectId: created.id,
      })
      return created
    },
    formatSummary: (result) => {
      const res = result as { name?: string }
      return `Project '${res.name}' created successfully`
    },
  }),

  // ── Folder Tools ───────────────────────────────────────────────────────────
  defineTool({
    name: 'list_folders',
    description: 'List all active organization folders inside an API project.',
    inputSchema: z.object({
      projectId: z.string().min(1).describe('The project ID whose folders to list'),
    }),
    readOnly: true,
    execute: async ({ projectId }) => {
      return folderService.listByProject(projectId)
    },
    formatSummary: (result) => `Found ${(result as unknown[]).length} folders`,
  }),

  defineTool({
    name: 'create_folder',
    description: 'Create an organization folder inside an API project.',
    inputSchema: z.object({
      projectId: z.string().min(1).describe('The target project ID'),
      name: z.string().trim().min(1).describe('The name of the folder'),
      parentId: z
        .string()
        .nullable()
        .optional()
        .describe('Parent folder ID if nested, or null/omitted for root'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ name, projectId }) =>
      `Create folder "${name}" in project (${projectId})`,
    execute: async (input, ctx) => {
      const created = await folderService.create({
        ...input,
        created_by: ctx.accountId || undefined,
      } as any)
      ctx.onUiEffect?.({
        type: 'highlight',
        projectId: input.projectId,
      })
      return created
    },
    formatSummary: (result) => {
      const res = result as { name?: string }
      return `Folder '${res.name}' created`
    },
  }),

  defineTool({
    name: 'update_folder',
    description: 'Rename or move a folder. Set parentId to null to move it to the project root.',
    inputSchema: z.object({
      folderId: z.string().min(1).describe('The folder ID to update'),
      name: z.string().trim().min(1).optional().describe('New name of the folder'),
      parentId: z
        .string()
        .nullable()
        .optional()
        .describe('New parent folder ID or null to move to root'),
      sortOrder: z.number().int().min(0).optional().describe('Order index for sorting'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ name, folderId }) =>
      `Update folder ${name ? `"${name}"` : `ID ${folderId}`}`,
    execute: async ({ folderId, ...changes }, ctx) => {
      const updated = await folderService.update(folderId, changes)
      ctx.onUiEffect?.({
        type: 'highlight',
        projectId: updated.projectId,
      })
      return updated
    },
    formatSummary: (result) => {
      const res = result as { name?: string }
      return `Folder '${res.name}' updated`
    },
  }),

  defineTool({
    name: 'delete_folder',
    description:
      'Delete an active folder. Nested folders must be deleted first; contained endpoints move to the project root.',
    inputSchema: z.object({
      folderId: z.string().min(1).describe('The folder ID to delete'),
    }),
    destructive: true,
    requiresConfirmation: true,
    formatConfirmation: ({ folderId }) => `Permanently delete folder (ID: ${folderId})`,
    execute: async ({ folderId }, ctx) => {
      const { projectId } = await folderService.delete(folderId, ctx.accountId)
      ctx.onUiEffect?.({
        type: 'highlight',
        projectId,
      })
      return { success: true }
    },
    formatSummary: () => 'Folder deleted',
  }),

  // ── Endpoint Tools ─────────────────────────────────────────────────────────
  defineTool({
    name: 'get_endpoints_by_project',
    description:
      'Search and inspect active endpoints in a project with optional method/folder/query filters.',
    inputSchema: z.object({
      projectId: z.string().min(1).describe('The project ID'),
      method: z.string().optional().describe('HTTP method filter: GET, POST, PUT, DELETE, etc.'),
      folderId: z.string().optional().describe('Folder ID filter'),
      query: z.string().optional().describe('Search query matching path or summary'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Max number of endpoints to return'),
    }),
    readOnly: true,
    execute: async (input) => {
      return endpointRepository.findByProjectFiltered(input)
    },
    formatSummary: (result) => `Retrieved ${(result as unknown[]).length} endpoints`,
  }),

  defineTool({
    name: 'get_endpoint_detail',
    description:
      'Read the complete OpenAPI specification and configuration of a specific endpoint by ID.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The unique ID of the endpoint'),
    }),
    readOnly: true,
    execute: async ({ endpointId }) => {
      return endpointService.get(endpointId)
    },
    formatSummary: (result) => {
      const res = result as {
        endpoint?: { method?: string; path?: string }
        method?: string
        path?: string
      } | null
      const method = res?.endpoint?.method || res?.method
      const path = res?.endpoint?.path || res?.path
      return method && path ? `Endpoint [${method}] ${path} loaded` : 'Endpoint loaded'
    },
  }),

  defineTool({
    name: 'create_endpoint',
    description: 'Create an endpoint and optionally its complete OpenAPI contract.',
    inputSchema: z.object({
      projectId: z.string().min(1).describe('The target project ID'),
      folderId: z.string().nullable().optional().describe('Folder ID or null for root level'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'])
        .describe('HTTP method'),
      path: z.string().min(1).describe('Endpoint URL path, e.g. /users/{id}'),
      summary: z.string().optional().describe('Short summary of what this endpoint does'),
      specData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'OpenAPI operation fields: parameters, requestBody, responses, tags, security, description, operationId.',
        ),
    }),
    requiresConfirmation: true,
    formatConfirmation: (input) => `Create new endpoint [${input.method}] ${input.path} in project`,
    planLiveEdit: async ({ projectId, folderId, method, path, summary, specData }) => {
      // Only an empty shell is created server-side so the endpoint can be opened;
      // everything else is typed into the form and saved by the client.
      const shell = await endpointService.create({
        projectId,
        folderId,
        method,
        path: '/',
        summary: '',
      })
      const nextSpec = mergeSpec(shell.specData, specData)
      return {
        projectId,
        endpointId: shell.id,
        ops: [
          ...headerOps({ path, summary: summary ?? '' }),
          ...specOps(shell.specData, specData, nextSpec),
        ],
        patch: endpointPatch({ method, path, summary: summary ?? '', specData: nextSpec }),
      }
    },
    execute: async (input, ctx) => {
      const created = await endpointService.create(input)
      ctx.onUiEffect?.({
        type: 'navigate',
        projectId: input.projectId,
        endpointId: created.id,
        tab: 'params',
        target: 'url',
      })
      ctx.onUiEffect?.({
        type: 'highlight',
        endpointId: created.id,
        target: 'url',
      })
      return created
    },
    formatSummary: (result) => {
      const res = result as { method?: string; path?: string }
      return `Endpoint [${res.method}] ${res.path} created`
    },
  }),

  defineTool({
    name: 'update_endpoint_contract',
    description:
      'Update endpoint method, path, summary, folder, or merge OpenAPI operation fields into its contract.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The unique endpoint ID'),
      folderId: z.string().nullable().optional().describe('Target folder ID or null for root'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE'])
        .optional()
        .describe('New HTTP method'),
      path: z.string().min(1).optional().describe('New path'),
      summary: z.string().optional().describe('New summary description'),
      specData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Partial or full OpenAPI specData object to merge'),
    }),
    requiresConfirmation: true,
    formatConfirmation: (input) => {
      const parts: string[] = []
      if (input.method || input.path)
        parts.push(`[${input.method || 'METHOD'}] ${input.path || 'path'}`)
      if (input.summary) parts.push(`summary: "${input.summary}"`)
      if (input.specData?.description) parts.push(`markdown documentation`)
      if (input.specData?.requestBody) parts.push(`request body`)
      if (input.specData?.responses) parts.push(`responses`)
      if (input.specData?.parameters) parts.push(`parameters`)
      return `Update endpoint: ${parts.length > 0 ? parts.join(', ') : input.endpointId}`
    },
    planLiveEdit: async ({ endpointId, specData, folderId, method, path, summary }) => {
      const current = await endpointService.get(endpointId)
      const nextSpec = mergeSpec(current.specData, specData)
      return {
        projectId: current.projectId,
        endpointId,
        ops: [
          ...headerOps({ method, path, summary }),
          ...specOps(current.specData, specData, nextSpec),
        ],
        patch: endpointPatch({
          method,
          path,
          summary,
          folderId,
          specData: specData ? nextSpec : undefined,
        }),
      }
    },
    execute: async ({ endpointId, specData, ...changes }, ctx) => {
      const current = await endpointService.get(endpointId)
      const updated = await endpointService.update(endpointId, {
        ...changes,
        ...(specData ? { specData: { ...current.specData, ...specData } } : {}),
      })

      // Dispatch UI effect based on what was updated
      if (changes.path !== undefined || changes.method !== undefined) {
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'url',
        })
      }
      if (changes.summary !== undefined) {
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'summary',
        })
      }
      if (specData?.requestBody !== undefined) {
        ctx.onUiEffect?.({
          type: 'tab_change',
          endpointId,
          tab: 'body',
          target: 'body',
        })
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'body',
        })
      } else if (specData?.responses !== undefined) {
        ctx.onUiEffect?.({
          type: 'tab_change',
          endpointId,
          tab: 'examples',
          target: 'responses',
        })
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'responses',
        })
      } else if (specData?.parameters !== undefined) {
        ctx.onUiEffect?.({
          type: 'tab_change',
          endpointId,
          tab: 'params',
          target: 'params',
        })
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'params',
        })
      } else if (specData?.description !== undefined) {
        ctx.onUiEffect?.({
          type: 'tab_change',
          endpointId,
          tab: 'docs',
          target: 'docs',
        })
        ctx.onUiEffect?.({
          type: 'highlight',
          endpointId,
          target: 'docs',
        })
      }

      return updated
    },
    formatSummary: (result) => {
      const res = result as { method?: string; path?: string }
      return `Endpoint [${res.method}] ${res.path} updated`
    },
  }),

  // ── Endpoint Docs (Markdown) Tools ─────────────────────────────────────────
  defineTool({
    name: 'get_endpoint_docs',
    description:
      'Read the markdown documentation (Docs tab) of an endpoint. Returns an empty string when none is written yet.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The unique endpoint ID'),
    }),
    readOnly: true,
    execute: async ({ endpointId }) => {
      const endpoint = await endpointService.get(endpointId)
      const markdown = (endpoint.specData?.description as string | undefined) ?? ''
      return {
        endpointId,
        method: endpoint.method,
        path: endpoint.path,
        markdown,
      }
    },
    formatSummary: (result) => {
      const res = result as { markdown: string }
      return res.markdown ? `Docs loaded (${res.markdown.length} chars)` : 'No docs written yet'
    },
  }),

  defineTool({
    name: 'update_endpoint_docs',
    description:
      'Write the markdown documentation (Docs tab) of an endpoint. mode "replace" overwrites the whole document (default), "append" adds the markdown to the end. Always read the current docs with get_endpoint_docs before editing part of an existing document.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The unique endpoint ID'),
      markdown: z.string().describe('Markdown content to write'),
      mode: z
        .enum(['replace', 'append'])
        .optional()
        .describe('"replace" (default) overwrites the docs, "append" adds to the end'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ endpointId, mode }) =>
      `${mode === 'append' ? 'Append to' : 'Replace'} markdown docs of endpoint (${endpointId})`,
    planLiveEdit: async ({ endpointId, markdown, mode }) => {
      const current = await endpointService.get(endpointId)
      const existing = (current.specData?.description as string | undefined) ?? ''
      const description =
        mode === 'append' && existing ? `${existing.trimEnd()}\n\n${markdown}` : markdown
      return {
        projectId: current.projectId,
        endpointId,
        ops: [{ kind: 'docs', value: description }],
        patch: { specData: { ...current.specData, description } },
      }
    },
    execute: async ({ endpointId, markdown, mode }, ctx) => {
      const current = await endpointService.get(endpointId)
      const existing = (current.specData?.description as string | undefined) ?? ''
      const description =
        mode === 'append' && existing ? `${existing.trimEnd()}\n\n${markdown}` : markdown

      const updated = await endpointService.update(endpointId, {
        specData: { ...current.specData, description },
      })

      ctx.onUiEffect?.({ type: 'tab_change', endpointId, tab: 'docs', target: 'docs' })
      ctx.onUiEffect?.({ type: 'highlight', endpointId, target: 'docs' })
      return { endpointId, method: updated.method, path: updated.path, markdown: description }
    },
    formatSummary: (result) => {
      const res = result as { method?: string; path?: string }
      return `Docs of [${res.method}] ${res.path} updated`
    },
  }),

  defineTool({
    name: 'move_endpoint',
    description:
      'Move an endpoint into a folder, or set folderId to null to move it to the project root.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The endpoint ID'),
      folderId: z.string().nullable().describe('Folder ID to move to, or null for root level'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ endpointId, folderId }) =>
      `Move endpoint (${endpointId}) to ${folderId ? `folder ${folderId}` : 'project root'}`,
    execute: async ({ endpointId, folderId }, ctx) => {
      const res = await endpointService.update(endpointId, { folderId })
      ctx.onUiEffect?.({
        type: 'highlight',
        endpointId,
      })
      return res
    },
    formatSummary: () => 'Endpoint moved successfully',
  }),

  defineTool({
    name: 'create_example',
    description: 'Add a JSON example to an endpoint request body or one response status.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The endpoint ID'),
      scope: z
        .enum(['request', 'response'])
        .describe('Whether this example is for a request body or response body'),
      responseStatus: z
        .string()
        .optional()
        .describe('Required for response examples, for example 200 or 404.'),
      name: z.string().trim().min(1).describe('Example name label'),
      summary: z.string().optional().describe('Description of the example scenario'),
      value: z.unknown().describe('JSON value payload. It will be stored as formatted JSON text.'),
    }),
    requiresConfirmation: true,
    formatConfirmation: ({ name, scope, responseStatus }) =>
      `Add ${scope} example "${name}"${responseStatus ? ` (Status ${responseStatus})` : ''} to endpoint`,
    planLiveEdit: async ({ endpointId, scope, responseStatus, name, summary, value }) => {
      const endpoint = await endpointService.get(endpointId)
      const contract = buildExampleContract(endpoint, {
        scope,
        responseStatus,
        name,
        summary,
        value,
      })
      return {
        projectId: endpoint.projectId,
        endpointId,
        ops: [
          {
            kind: 'example',
            scope,
            responseId: contract.responseId,
            statusCode: responseStatus,
            example: contract.example,
          },
        ],
        patch: {
          specData: {
            ...endpoint.specData,
            requestBody: contract.requestBody,
            responses: contract.responses,
          },
        },
      }
    },
    execute: async ({ endpointId, scope, responseStatus, name, summary, value }, ctx) => {
      const endpoint = await endpointService.get(endpointId)
      const contract = buildExampleContract(endpoint, {
        scope,
        responseStatus,
        name,
        summary,
        value,
      })
      const exampleId = contract.example.id
      const updatedResult = await endpointService.updateExamples(endpointId, {
        requestBody: contract.requestBody,
        responses: contract.responses,
      })

      ctx.onUiEffect?.({
        type: 'tab_change',
        endpointId,
        tab: 'examples',
        exampleId,
        target: 'examples',
      })
      ctx.onUiEffect?.({
        type: 'highlight',
        endpointId,
        target: 'examples',
      })

      return updatedResult
    },
    formatSummary: (_res, input) => `Example '${input.name}' added to endpoint`,
  }),

  // ── Mock Server Tools ──────────────────────────────────────────────────────
  defineTool({
    name: 'list_mock_examples',
    description:
      'List all available mock responses, examples, and status code simulations configured across endpoints.',
    inputSchema: z.object({
      projectId: z.string().optional().describe('Filter mock examples by project ID (optional)'),
      endpointId: z
        .string()
        .optional()
        .describe('Filter mock examples for a specific endpoint (optional)'),
    }),
    readOnly: true,
    execute: async (input) => {
      let endpoints = await endpointRepository.findAllActive()
      if (input.projectId) {
        endpoints = endpoints.filter((e) => e.project_id === input.projectId)
      }
      if (input.endpointId) {
        endpoints = endpoints.filter((e) => e.id === input.endpointId)
      }

      return endpoints.flatMap((endpoint) =>
        collectMockExamples([
          {
            id: endpoint.id,
            method: endpoint.method,
            path: endpoint.path,
            summary: endpoint.summary,
            specData: (endpoint.spec_data ?? {}) as Record<string, unknown>,
          },
        ]).map((entry) => ({
          endpointId: entry.endpointId,
          method: entry.endpointMethod,
          path: entry.endpointPath,
          summary: entry.endpointSummary,
          responseStatus: entry.responseStatus,
          exampleId: entry.exampleId,
          exampleName: entry.exampleName,
          exampleSummary: entry.exampleSummary,
          mockUrl: entry.exampleId
            ? `/api/mock/${entry.endpointId}/ex/${entry.exampleId}`
            : `/api/mock/${entry.endpointId}/${entry.responseStatus}`,
        })),
      )
    },
    formatSummary: (result) => `Found ${(result as unknown[]).length} mock examples`,
  }),

  defineTool({
    name: 'simulate_mock_response',
    description:
      'Simulate and inspect what payload and status code the Mock Server would return for an endpoint.',
    inputSchema: z.object({
      endpointId: z.string().min(1).describe('The endpoint ID'),
      statusCode: z
        .string()
        .optional()
        .describe('Specific HTTP status code to simulate (e.g. 200, 404)'),
      exampleId: z.string().optional().describe('Specific example ID to simulate'),
    }),
    readOnly: true,
    execute: async (input) => {
      const endpoint = await endpointRepository.findById(input.endpointId)
      if (!endpoint) {
        return { error: 'Endpoint not found' }
      }
      const mockResult = resolveMock((endpoint.spec_data ?? {}) as Record<string, unknown>, {
        status: input.statusCode,
        exampleId: input.exampleId,
      })
      return {
        statusCode: mockResult.statusCode,
        contentType: mockResult.contentType,
        headers: mockResult.headers,
        bodyPreview: mockResult.body.slice(0, 2000),
      }
    },
    formatSummary: (result) => {
      const res = result as { statusCode?: number; contentType?: string; error?: string }
      if (res.error) return res.error
      return `Status: ${res.statusCode}, Content-Type: ${res.contentType}`
    },
  }),
]
