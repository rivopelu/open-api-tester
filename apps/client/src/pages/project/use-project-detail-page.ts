import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import type { Endpoint } from '@modern-api-studio/types';
import type { EndpointDto } from '../../lib/api';
import { projectQueryKeys } from '../../queries/project.queries';
import { endpointFolderRepository, endpointRepository, projectRepository } from '../../repositories';

function toEndpoint(dto: EndpointDto): Endpoint {
  const spec = dto.specData ?? {};
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
  };
}

export function useProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(id ?? ''),
    queryFn: () => projectRepository.get(id as string),
    enabled: Boolean(id),
  });

  const invalidateProject = useCallback(async () => {
    if (id) await queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) });
  }, [id, queryClient]);

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      endpointFolderRepository.create({ projectId: id as string, name, parentId }),
    onSuccess: invalidateProject,
  });
  const renameFolderMutation = useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      endpointFolderRepository.update(folderId, { name }),
    onSuccess: invalidateProject,
  });
  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => endpointFolderRepository.remove(folderId),
    onSuccess: invalidateProject,
  });
  const renameEndpointMutation = useMutation({
    mutationFn: ({ endpointId, name }: { endpointId: string; name: string }) =>
      endpointRepository.update(endpointId, { summary: name }),
    onSuccess: invalidateProject,
  });
  const moveEndpointMutation = useMutation({
    mutationFn: ({ endpointId, folderId }: { endpointId: string; folderId: string | null }) =>
      endpointRepository.update(endpointId, { folderId }),
    onSuccess: invalidateProject,
  });

  const project = projectQuery.data?.project ?? null;
  const endpointDtos = useMemo(() => projectQuery.data?.endpoints ?? [], [projectQuery.data?.endpoints]);
  const folders = useMemo(() => projectQuery.data?.folders ?? [], [projectQuery.data?.folders]);
  const endpoints = useMemo<Endpoint[]>(() => endpointDtos.map(toEndpoint), [endpointDtos]);

  const tagGroups = useMemo(() => {
    const map: Record<string, Endpoint[]> = { Untagged: [] };
    for (const endpoint of endpoints) {
      const endpointTags = endpoint.tags ?? [];
      if (endpointTags.length === 0) map.Untagged.push(endpoint);
      else for (const tag of endpointTags) (map[tag] ??= []).push(endpoint);
    }
    if (map.Untagged.length === 0) delete map.Untagged;
    return map;
  }, [endpoints]);

  const tags = useMemo(() => {
    const names = new Set<string>();
    for (const endpoint of endpoints) for (const tag of endpoint.tags ?? []) names.add(tag);
    return Array.from(names).map((name) => ({ id: name, name, description: undefined }));
  }, [endpoints]);

  const selectedEndpoint = useMemo(
    () => endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? null,
    [endpoints, selectedEndpointId],
  );

  const handleSelectEndpoint = useCallback((endpointId: string) => setSelectedEndpointId(endpointId), []);
  const promptName = (message: string, initial = '') => window.prompt(message, initial)?.trim() ?? '';

  return {
    projectId: id,
    project,
    endpoints,
    endpointDtos,
    folders,
    tagGroups,
    tags,
    loading: projectQuery.isPending,
    error: projectQuery.error instanceof Error ? projectQuery.error.message : null,
    selectedEndpoint,
    selectedEndpointId,
    handleSelectEndpoint,
    createFolder: async (parentId: string | null) => {
      const name = promptName('Folder name:', 'New Folder');
      if (name) await createFolderMutation.mutateAsync({ name, parentId });
    },
    renameFolder: async (folderId: string, currentName: string) => {
      const name = promptName('Rename folder:', currentName);
      if (name && name !== currentName) await renameFolderMutation.mutateAsync({ folderId, name });
    },
    deleteFolder: async (folderId: string) => {
      if (window.confirm('Delete this folder? It must be empty.')) await deleteFolderMutation.mutateAsync(folderId);
    },
    renameEndpoint: async (endpointId: string, currentName: string) => {
      const name = promptName('Rename endpoint:', currentName);
      if (name && name !== currentName) await renameEndpointMutation.mutateAsync({ endpointId, name });
    },
    moveEndpoint: (endpointId: string, folderId: string | null) =>
      moveEndpointMutation.mutateAsync({ endpointId, folderId }),
  };
}
