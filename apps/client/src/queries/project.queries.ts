export const projectQueryKeys = {
  all: ['projects'] as const,
  list: () => [...projectQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...projectQueryKeys.all, 'detail', id] as const,
  folders: (id: string) => [...projectQueryKeys.detail(id), 'folders'] as const,
};

export const endpointQueryKeys = {
  all: ['endpoints'] as const,
  detail: (id: string) => [...endpointQueryKeys.all, 'detail', id] as const,
};
