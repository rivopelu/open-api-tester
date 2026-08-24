import type {
    EndpointExample,
    HttpMethod,
    ResponseDefinition
} from '@modern-api-studio/types'
import { NotFoundError } from '../../../configs/exception'

export interface MockExampleRef {
  endpointId: string
  exampleId: string
}

export interface MockResponsePayload {
  statusCode: number
  contentType: string
  body: string
  headers?: Record<string, EndpointParameter_>
}

type EndpointParameter_ = NonNullable<ResponseDefinition['headers']>[string]

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

/**
 * Resolve the mock payload for an endpoint's stored specData.
 * Priority: explicit ?example= / :exampleId → first example of the requested
 * status → first response with examples → response.example → first response.
 */
export function resolveMock(
  specData: Record<string, unknown>,
  options: { exampleId?: string; status?: string } = {},
): MockResponsePayload {
  const responses = Array.isArray(specData.responses)
    ? (specData.responses as ResponseDefinition[]).filter((response) => !!asRecord(response))
    : []
  if (responses.length === 0)
    throw new NotFoundError('This endpoint has no response examples to mock')

  const pickExample = (response: ResponseDefinition): EndpointExample | undefined => {
    const examples = Array.isArray(response.examples) ? response.examples : []
    if (options.exampleId)
      return (
        examples.find((example) => example.id === options.exampleId) ??
        examples.find((example) => example.name === options.exampleId)
      )
    return examples[0]
  }

  let target = responses[0]
  if (options.exampleId) {
    target =
      responses.find((response) =>
        (response.examples ?? []).some(
          (example) => example.id === options.exampleId || example.name === options.exampleId,
        ),
      ) ?? target
  } else if (options.status) {
    target =
      responses.find(
        (response) =>
          response.statusCode === options.status &&
          (response.examples?.length || response.example !== undefined),
      ) ?? target
  }

  const chosen = pickExample(target)
  if (chosen && typeof chosen.value === 'string' && chosen.value.trim())
    return toPayload(target.statusCode, target.contentType, chosen.value, target.headers)

  const rawExample = target.example
  if (typeof rawExample === 'string' && rawExample.trim())
    return toPayload(target.statusCode, target.contentType, rawExample, target.headers)
  if (rawExample !== undefined) {
    return {
      statusCode: toStatus(target.statusCode),
      contentType: target.contentType ?? 'application/json',
      body: JSON.stringify(rawExample),
    }
  }

  // No stored payload anywhere: synthesize a JSON skeleton from the schema.
  return toPayload(
    target.statusCode,
    target.contentType,
    JSON.stringify(buildSkeleton(target.schema), null, 2),
    target.headers,
  )
}

function toStatus(statusCode: string | number | undefined): number {
  const parsed = Number.parseInt(String(statusCode ?? ''), 10)
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : 200
}

function toPayload(
  statusCode: string | number | undefined,
  contentType: string | undefined,
  body: string,
  headers?: Record<string, EndpointParameter_>,
): MockResponsePayload {
  return {
    statusCode: toStatus(statusCode),
    contentType: contentType?.trim() || 'application/json',
    body,
    headers,
  }
}

/** Build a minimal JSON skeleton from the visual schema builder shape. */
export function buildSkeleton(
  schema: SchemaPropertyLike[] | undefined,
): Record<string, unknown> | unknown[] {
  const objectBody: Record<string, unknown> = {}
  for (const property of schema ?? []) {
    if (!property?.name) continue
    objectBody[property.name] = sampleFor(property)
  }
  return objectBody
}

interface SchemaPropertyLike {
  name?: string
  type?: string
  example?: unknown
  default?: unknown
  enum?: string[]
  items?: SchemaPropertyLike
  properties?: SchemaPropertyLike[]
}

function sampleFor(property: SchemaPropertyLike): unknown {
  if (property.example !== undefined && property.example !== null && property.example !== '')
    return property.example
  if (property.default !== undefined) return property.default
  if (Array.isArray(property.enum) && property.enum.length > 0) return property.enum[0]
  switch (property.type) {
    case 'integer':
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'array':
      return [sampleFor(property.items ?? {})]
    case 'object':
      return buildSkeleton(property.properties)
    default:
      return ''
  }
}

/** Collect every servable example reference from a list of endpoint records. */
export function collectMockExamples(
  endpoints: Array<{
    id: string
    method: HttpMethod | string
    path: string
    summary: string
    specData: Record<string, unknown>
  }>,
): Array<{
  endpointId: string
  endpointPath: string
  endpointMethod: string
  endpointSummary: string
  responseStatus: string
  exampleId: string | null
  exampleName: string | null
  exampleSummary: string | null
  scope: 'default' | 'status' | 'example'
}> {
  const result: Array<ReturnType<typeof collectMockExamples>[number]> = []
  for (const endpoint of endpoints) {
    const responses = Array.isArray(endpoint.specData.responses)
      ? (endpoint.specData.responses as ResponseDefinition[])
      : []
    for (const response of responses) {
      const examples = Array.isArray(response.examples) ? response.examples : []
      if (examples.length > 0) {
        for (const example of examples) {
          result.push({
            endpointId: endpoint.id,
            endpointPath: endpoint.path,
            endpointMethod: endpoint.method,
            endpointSummary: endpoint.summary,
            responseStatus: response.statusCode,
            exampleId: example.id,
            exampleName: example.name ?? null,
            exampleSummary: example.summary ?? null,
            scope: 'example',
          })
        }
        continue
      }
      if (
        response.example !== undefined ||
        (Array.isArray(response.schema) && response.schema.length > 0)
      ) {
        result.push({
          endpointId: endpoint.id,
          endpointPath: endpoint.path,
          endpointMethod: endpoint.method,
          endpointSummary: endpoint.summary,
          responseStatus: response.statusCode,
          exampleId: null,
          exampleName: null,
          exampleSummary: null,
          scope: response.example !== undefined ? 'status' : 'default',
        })
      }
    }
  }
  return result
}
