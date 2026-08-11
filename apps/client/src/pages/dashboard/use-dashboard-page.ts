import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { projectRepository } from '../../repositories';
import { projectQueryKeys } from '../../queries/project.queries';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { useAuthStore } from '../../store/useAuthStore';
import { router } from '../../routes';

export interface DashboardStat {
  key: string;
  label: string;
  value: string;
}

export default function useDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { createNewProject, deleteProject, renameProject } = useApiSpecStore();
  const { user, signOut } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const projectsQuery = useQuery({
    queryKey: projectQueryKeys.list(),
    queryFn: () => projectRepository.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createNewProject(name),
    onSuccess: async (projectId) => {
      if (!projectId) return;
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      navigate(router.project.detail(projectId));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: async (deleted) => {
      if (deleted) {
        await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameProject(id, name),
    onSuccess: async (renamed) => {
      if (renamed) {
        await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      }
    },
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const selectProject = useCallback(
    (id: string) => navigate(router.project.detail(id)),
    [navigate],
  );

  const createProject = useCallback(
    async (name: string) => Boolean(await createMutation.mutateAsync(name)),
    [createMutation],
  );

  const removeProject = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this project? This action cannot be undone.')) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  const renameSelectedProject = useCallback(
    async (id: string, newName: string) => {
      const name = newName.trim();
      if (!name || name === projects.find((project) => project.id === id)?.name) return;
      await renameMutation.mutateAsync({ id, name });
    },
    [projects, renameMutation],
  );

  const lastUpdated = useMemo(
    () =>
      projects.length > 0
        ? new Date(
            Math.max(...projects.map((project) => new Date(project.updatedAt ?? 0).getTime())),
          )
        : null,
    [projects],
  );

  const stats: DashboardStat[] = [
    { key: 'projects', label: 'Total Projects', value: String(projects.length) },
    {
      key: 'updated',
      label: 'Last Updated',
      value: lastUpdated ? lastUpdated.toLocaleDateString() : '—',
    },
  ];

  return {
    headline: user?.name ? `Welcome back, ${user.name}` : 'Projects',
    subtitle: 'Manage your OpenAPI API projects',
    loading: projectsQuery.isPending,
    error: projectsQuery.error,
    projects,
    stats,
    showCreate,
    showImport,
    handleCreateClick: () => setShowCreate(true),
    closeCreate: () => setShowCreate(false),
    createProject,
    openImport: () => setShowImport(true),
    closeImport: () => setShowImport(false),
    selectProject,
    removeProject,
    renameSelectedProject,
    onImported: async () => {
      setShowImport(false);
      await queryClient.invalidateQueries({ queryKey: projectQueryKeys.all });
      navigate(router.editor.base());
    },
    signout: signOut,
  };
}
