import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { projectApi, type ProjectDto, type EndpointDto } from '../../lib/api'
import type { Endpoint } from '@modern-api-studio/types'

// Convert EndpointDto (DB row) → Endpoint (client shape used by sidebar/detail)
function toEndpoint(dto: EndpointDto): Endpoint {
  const spec = dto.specData ?? {}
  return {
    id: dto.id,
    path: dto.path,
    method: (dto.method as Endpoint['method']) ?? 'GET',
    summary: dto.summary ?? (typeof spec.summary === 'string' ? spec.summary : undefined),
    description: typeof spec.description === 'string' ? spec.description : undefined,
    operationId: typeof spec.operationId === 'string' ? spec.operationId : undefined,
    tags: Array.isArray(spec.tags) ? (spec.tags as string[]) : [],
    deprecated: Boolean(spec.deprecated),
    security: Array.isArray(spec.security) ? (spec.security as string[]) : undefined,
    parameters: Array.isArray(spec.parameters) ? (spec.parameters as Endpoint['parameters']) : [],
    requestBody: spec.requestBody as Endpoint['requestBody'],
    responses: Array.isArray(spec.responses) ? (spec.responses as Endpoint['responses']) : [],
  }
}

export function useProjectDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [endpointDtos, setEndpointDtos] = useState<EndpointDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    projectApi
      .get(id)
      .then((data) => {
        setProject(data.project)
        setEndpointDtos(data.endpoints)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load project'))
      .finally(() => setLoading(false))
  }, [id])

  const endpoints = useMemo<Endpoint[]>(() => endpointDtos.map(toEndpoint), [endpointDtos])

  // Group endpoints by tag (Untagged bucket for no-tag endpoints)
  const tagGroups = useMemo(() => {
    const map: Record<string, Endpoint[]> = { Untagged: [] }
    for (const ep of endpoints) {
      const epTags = ep.tags ?? []
      if (epTags.length === 0) {
        map.Untagged.push(ep)
      } else {
        for (const tag of epTags) {
          if (!map[tag]) map[tag] = []
          map[tag].push(ep)
        }
      }
    }
    // Remove empty Untagged
    if (map.Untagged.length === 0) delete map.Untagged
    return map
  }, [endpoints])

  const tags = useMemo(() => {
    const set = new Set<string>()
    for (const ep of endpoints) {
      for (const t of ep.tags ?? []) set.add(t)
    }
    return Array.from(set).map((name) => ({ id: name, name, description: undefined }))
  }, [endpoints])

  const selectedEndpoint = useMemo(
    () => endpoints.find((ep) => ep.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  )

  const handleSelectEndpoint = useCallback((epId: string) => {
    setSelectedEndpointId(epId)
  }, [])

  return {
    projectId: id,
    project,
    endpoints,
    endpointDtos,
    tagGroups,
    tags,
    loading,
    error,
    selectedEndpoint,
    selectedEndpointId,
    handleSelectEndpoint,
  }
}