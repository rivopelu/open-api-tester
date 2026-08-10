import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectApi, type ProjectDto } from '../../lib/api'
import { useApiSpecStore } from '../../store/useApiSpecStore'
import { useAuthStore } from '../../store/useAuthStore'
import { router } from '../../routes'

export type DashboardStat = {
  key: string
  label: string
  value: string
}

/**
 * Backs the Projects dashboard. Owns all state and side-effects for the page
 * and returns a plain view-model, so the presentational page stays thin
 * (mirrors the `use-*-page` pattern in biwave/fe-biwave).
 */
export default function useDashboardPage() {
  const navigate = useNavigate()
  const { loadProject, createNewProject, deleteProject, renameProject } =
    useApiSpecStore()
  const { user, signOut } = useAuthStore()
  const [projects, setProjects] = useState<ProjectDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    let cancelled = false
    projectApi
      .list()
      .then((items) => {
        if (!cancelled) setProjects(items)
      })
      .catch((err: unknown) => {
        console.error('[fetchProjects]', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectProject = useCallback(
    async (id: string) => {
      await loadProject(id)
      navigate(router.editor.base())
    },
    [loadProject, navigate],
  )

  const createProject = useCallback(
    async (name: string) => {
      const ok = await createNewProject(name)
      if (ok) navigate(router.editor.base())
    },
    [createNewProject, navigate],
  )

  const handleCreateClick = useCallback(async () => {
    const name = window.prompt('Enter project name:', 'New API Project')
    if (!name) return
    await createProject(name)
  }, [createProject])

  const removeProject = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this project? This action cannot be undone.'))
        return
      const ok = await deleteProject(id)
      if (ok) setProjects((prev) => prev.filter((p) => p.id !== id))
    },
    [deleteProject],
  )

  const renameSelectedProject = useCallback(
    async (id: string, newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed || trimmed === projects.find((p) => p.id === id)?.name) return
      const ok = await renameProject(id, trimmed)
      if (ok) setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)))
    },
    [renameProject, projects],
  )

  const openImport = useCallback(() => setShowImport(true), [])
  const closeImport = useCallback(() => setShowImport(false), [])
  const onImported = useCallback(() => {
    setShowImport(false)
    navigate(router.editor.base())
  }, [navigate])

  const signout = useCallback(() => signOut(), [signOut])

  const lastUpdated =
    projects.length > 0
      ? new Date(
          Math.max(...projects.map((p) => new Date(p.updatedAt ?? 0).getTime())),
        )
      : null

  const stats: DashboardStat[] = [
    { key: 'projects', label: 'Total Projects', value: String(projects.length) },
    {
      key: 'updated',
      label: 'Last Updated',
      value: lastUpdated ? lastUpdated.toLocaleDateString() : '—',
    },
  ]

  return {
    headline: user?.name ? `Welcome back, ${user.name}` : 'Projects',
    subtitle: 'Manage your OpenAPI API projects',
    loading,
    projects,
    stats,
    showImport,
    openImport,
    closeImport,
    selectProject,
    handleCreateClick,
    removeProject,
    renameSelectedProject,
    onImported,
    signout,
  }
}