import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Endpoint, HttpMethod } from '@modern-api-studio/types';
import type { EndpointDto, EndpointSummaryDto } from '../../lib/api';
import { endpointQueryKeys, projectQueryKeys } from '../../queries/project.queries';
import { endpointFolderRepository, endpointRepository, projectRepository } from '../../repositories';
import type { ProjectItemDialogState } from './project-item-modal';

function toEndpoint(dto: EndpointDto | EndpointSummaryDto): Endpoint {
  const spec = 'specData' in dto ? dto.specData ?? {} : {};
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(() => searchParams.get('endpoint'));
  const [selectedEndpointTab, setSelectedEndpointTab] = useState(searchParams.get('tab') ?? 'params');
  const [selectedExampleId, setSelectedExampleId] = useState<string | undefined>(() => searchParams.get('example') ?? undefined);
  const [itemDialog, setItemDialog] = useState<ProjectItemDialogState | null>(null);

  const projectQuery = useQuery({
    queryKey: projectQueryKeys.detail(id ?? ''),
    queryFn: () => projectRepository.get(id as string),
    enabled: Boolean(id),
  });

  const endpointDetailQuery = useQuery({
    queryKey: endpointQueryKeys.detail(selectedEndpointId ?? ''),
    queryFn: () => endpointRepository.get(selectedEndpointId as string),
    enabled: Boolean(selectedEndpointId),
  });

  const invalidateProject = useCallback(async () => {
    if (id) await queryClient.invalidateQueries({ queryKey: projectQueryKeys.detail(id) });
  }, [id, queryClient]);

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string | null }) =>
      endpointFolderRepository.create({ projectId: id as string, name, parentId }),
    onSuccess: invalidateProject,
  });
  const createEndpointMutation = useMutation({
    mutationFn: ({ name, folderId }: { name: string; folderId: string | null }) =>
      endpointRepository.create({
        projectId: id as string,
        folderId,
        path: '/',
        method: 'GET',
        summary: name,
        specData: {
          tags: [],
          deprecated: false,
          parameters: [],
          responses: [],
        },
    }),
    onSuccess: async (endpoint) => {
      setSearchParams({ endpoint: endpoint.id, tab: 'params' });
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
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
    onSuccess: async (endpoint) => {
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
  });
  const moveEndpointMutation = useMutation({
    mutationFn: ({ endpointId, folderId }: { endpointId: string; folderId: string | null }) =>
      endpointRepository.update(endpointId, { folderId }),
    onSuccess: async (endpoint) => {
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
  });
  const moveFolderMutation = useMutation({
    mutationFn: ({ folderId, parentId }: { folderId: string; parentId: string | null }) =>
      endpointFolderRepository.update(folderId, { parentId }),
    onSuccess: invalidateProject,
  });
  const changeMethodMutation = useMutation({
    mutationFn: ({ endpointId, method }: { endpointId: string; method: HttpMethod }) =>
      endpointRepository.update(endpointId, { method }),
    onSuccess: async (endpoint) => {
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
  });
  const saveContractMutation = useMutation({
    mutationFn: ({ endpointId, requestBody, responses }: { endpointId: string; requestBody: Endpoint['requestBody']; responses: Endpoint['responses'] }) => {
      return endpointRepository.updateExamples(endpointId, { requestBody, responses });
    },
    onSuccess: async (endpoint) => {
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
  });
  const saveRequestMutation = useMutation({
    mutationFn: ({ endpointId, path, parameters, requestBody }: { endpointId: string; path: string; parameters: Endpoint['parameters']; requestBody?: Endpoint['requestBody'] }) => {
      const current = endpointDetailQuery.data;
      if (!current) throw new Error('Endpoint is not loaded');
      return endpointRepository.update(endpointId, {
        path,
        specData: { ...current.specData, parameters, requestBody },
      });
    },
    onSuccess: async (endpoint) => {
      queryClient.setQueryData(endpointQueryKeys.detail(endpoint.id), endpoint);
      await invalidateProject();
    },
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
    () => endpointDetailQuery.data ? toEndpoint(endpointDetailQuery.data) : null,
    [endpointDetailQuery.data],
  );

  useEffect(() => {
    setSelectedEndpointId(searchParams.get('endpoint'));
    setSelectedEndpointTab(searchParams.get('tab') ?? 'params');
    setSelectedExampleId(searchParams.get('example') ?? undefined);
  }, [searchParams]);

  const selectState = useCallback((endpointId: string, tab = 'params', exampleId?: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('endpoint', endpointId);
      next.set('tab', tab);
      if (exampleId) next.set('example', exampleId);
      else next.delete('example');
      return next;
    });
  }, [setSearchParams]);

  const handleSelectEndpoint = useCallback((endpointId: string) => {
    selectState(endpointId);
  }, [selectState]);
  const handleSelectExamples = useCallback((endpointId: string, exampleId?: string) => {
    selectState(endpointId, 'examples', exampleId);
  }, [selectState]);
  const handleEndpointStateChange = useCallback((tab: string, exampleId?: string) => {
    if (selectedEndpointId) selectState(selectedEndpointId, tab, exampleId);
  }, [selectState, selectedEndpointId]);

  const submitItemDialog = async (value?: string) => {
    if (!itemDialog) return;
    if (itemDialog.type === 'create-endpoint' && value) {
      await createEndpointMutation.mutateAsync({ name: value, folderId: itemDialog.folderId });
    } else if (itemDialog.type === 'create-folder' && value) {
      await createFolderMutation.mutateAsync({ name: value, parentId: itemDialog.parentId });
    } else if (itemDialog.type === 'rename-folder' && value && value !== itemDialog.currentName) {
      await renameFolderMutation.mutateAsync({ folderId: itemDialog.folderId, name: value });
    } else if (itemDialog.type === 'delete-folder') {
      await deleteFolderMutation.mutateAsync(itemDialog.folderId);
    } else if (itemDialog.type === 'rename-endpoint' && value && value !== itemDialog.currentName) {
      await renameEndpointMutation.mutateAsync({ endpointId: itemDialog.endpointId, name: value });
    }
  };

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
    endpointLoading: Boolean(selectedEndpointId) && endpointDetailQuery.isPending,
    endpointError: endpointDetailQuery.error instanceof Error ? endpointDetailQuery.error.message : null,
    selectedEndpoint,
    selectedEndpointId,
    handleSelectEndpoint,
    handleSelectExamples,
    handleEndpointStateChange,
    selectedEndpointTab,
    selectedExampleId,
    itemDialog,
    closeItemDialog: () => setItemDialog(null),
    submitItemDialog,
    createEndpoint: (folderId: string | null) => setItemDialog({ type: 'create-endpoint', folderId }),
    createFolder: (parentId: string | null) => setItemDialog({ type: 'create-folder', parentId }),
    renameFolder: (folderId: string, currentName: string) =>
      setItemDialog({ type: 'rename-folder', folderId, currentName }),
    deleteFolder: (folderId: string, currentName: string) =>
      setItemDialog({ type: 'delete-folder', folderId, currentName }),
    renameEndpoint: (endpointId: string, currentName: string) =>
      setItemDialog({ type: 'rename-endpoint', endpointId, currentName }),
    renameSelectedEndpoint: (name: string) => {
      if (!selectedEndpointId) return Promise.resolve();
      return renameEndpointMutation.mutateAsync({ endpointId: selectedEndpointId, name }).then(() => undefined);
    },
    moveEndpoint: (endpointId: string, folderId: string | null) =>
      moveEndpointMutation.mutateAsync({ endpointId, folderId }),
    moveFolder: (folderId: string, parentId: string | null) =>
      moveFolderMutation.mutateAsync({ folderId, parentId }),
    changeMethod: (method: HttpMethod) => {
      if (!selectedEndpointId) return Promise.resolve();
      return changeMethodMutation.mutateAsync({ endpointId: selectedEndpointId, method }).then(() => undefined);
    },
    saveContract: (contract: Pick<Endpoint, 'requestBody' | 'responses'>) => {
      if (!selectedEndpointId) return Promise.resolve();
      return saveContractMutation.mutateAsync({
        endpointId: selectedEndpointId,
        requestBody: contract.requestBody,
        responses: contract.responses,
      }).then(() => undefined);
    },
    saveRequest: (request: Pick<Endpoint, 'path' | 'parameters' | 'requestBody'>) => {
      if (!selectedEndpointId) return Promise.resolve();
      return saveRequestMutation.mutateAsync({ endpointId: selectedEndpointId, ...request }).then(() => undefined);
    },
  };
}
