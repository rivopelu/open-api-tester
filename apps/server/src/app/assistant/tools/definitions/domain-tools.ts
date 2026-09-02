import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type {
  EndpointExample,
  RequestBodyDefinition,
  ResponseDefinition,
} from '@modern-api-studio/types'
import { EndpointFolderService } from '../../../endpoint-folders/service/endpoint-folder.service'
import { EndpointRepository } from '../../../endpoints/repository/endpoint.repository'
import { EndpointService } from '../../../endpoints/service/endpoint.service'
import { ProjectRepository } from '../../../projects/repository/project.repository'
import { ProjectService } from '../../../projects/service/project.service'
import { collectMockExamples, resolveMock } from '../../../mock/service/mock.service'
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
    execute: async ({ endpointId, scope, responseStatus, name, summary, value }, ctx) => {
      const endpoint = await endpointService.get(endpointId)
      const spec = endpoint.specData
      const exampleId = randomUUID()

      let formattedValue: string
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          formattedValue = JSON.stringify(parsed, null, 2)
        } catch {
          formattedValue = value
        }
      } else if (value !== undefined && value !== null) {
        formattedValue = JSON.stringify(value, null, 2)
      } else {
        formattedValue = '{\n  \n}'
      }

      const example: EndpointExample = { id: exampleId, name, summary, value: formattedValue }
      const requestBody = spec.requestBody as RequestBodyDefinition | undefined
      const responses = Array.isArray(spec.responses)
        ? (spec.responses as ResponseDefinition[])
        : []

      let updatedResult
      if (scope === 'request') {
        updatedResult = await endpointService.updateExamples(endpointId, {
          requestBody: {
            required: requestBody?.required ?? false,
            contentType: requestBody?.contentType ?? 'application/json',
            schema: requestBody?.schema ?? [],
            ...requestBody,
            examples: [...(requestBody?.examples ?? []), example],
          },
          responses,
        })
      } else {
        if (!responseStatus) throw new Error('responseStatus is required for response examples')
        const response = responses.find((item) => item.statusCode === responseStatus)
        const nextResponses = response
          ? responses.map((item) =>
              item.id === response.id
                ? { ...item, examples: [...(item.examples ?? []), example] }
                : item,
            )
          : [
              ...responses,
              {
                id: randomUUID(),
                statusCode: responseStatus,
                description: 'Generated response',
                contentType: 'application/json',
                examples: [example],
              },
            ]

        updatedResult = await endpointService.updateExamples(endpointId, {
          requestBody,
          responses: nextResponses,
        })
      }

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
