import { ArrowLeft, PenTool, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Endpoint } from '@modern-api-studio/types'
import { Button, GridCell, GridPanel, PageContainer, Typography } from '../../components/ui'
import { EndpointListSidebar } from '../../components/EndpointListSidebar'
import EndpointDetailView from '../../components/EndpointDetailView'
import { useProjectDetailPage } from './use-project-detail-page'
import { ProjectItemModal } from './project-item-modal'

export default function ProjectDetailPage() {
  const page = useProjectDetailPage()
  const navigate = useNavigate()

  // Build tag groups for overview section
  const groups: { name: string; endpoints: Endpoint[] }[] = Object.entries(page.tagGroups).map(
    ([name, endpoints]) => ({ name, endpoints }),
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      {/* Topbar */}
      <div className="flex h-[52px] shrink-0 items-center border-b border-border bg-surface px-4">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Back to Projects"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Typography variant="heading-sm" as="h1" className="ml-2">
          {page.project?.name ?? 'Project Detail'}
        </Typography>
        <Button
          variant="primary"
          size="sm"
          className="ml-auto"
          onClick={() => navigate(page.projectId ? `/editor?project=${page.projectId}` : '/editor')}
          disabled={!page.project}
        >
          <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
          Open Editor
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Endpoint list sidebar */}
        <EndpointListSidebar
          endpoints={page.endpoints}
          endpointDtos={page.endpointDtos}
          folders={page.folders}
          activeEndpointId={page.selectedEndpoint?.id ?? null}
          onSelectEndpoint={page.handleSelectEndpoint}
          onCreateEndpoint={page.createEndpoint}
          onCreateFolder={page.createFolder}
          onRenameFolder={page.renameFolder}
          onDeleteFolder={page.deleteFolder}
          onRenameEndpoint={page.renameEndpoint}
          onMoveEndpoint={page.moveEndpoint}
        />

        {/* Main area: overview OR endpoint detail */}
        <main className="flex flex-1 flex-col overflow-hidden animate-fadeIn">
          {page.loading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : page.error ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Typography tone="danger" variant="heading-sm" className="mb-2">
                Failed to load project
              </Typography>
              <Typography tone="muted" variant="body-sm">
                {page.error}
              </Typography>
            </div>
          ) : page.selectedEndpoint ? (
            <EndpointDetailView
              endpoint={page.selectedEndpoint}
              className="flex-1"
            />
          ) : page.project ? (
            <PageContainer size="fluid">
              {/* Header info */}
              <header className="mb-6">
                <Typography variant="heading-lg" as="h1">
                  {page.project.name}
                </Typography>
                <Typography tone="muted" variant="body-sm">
                  {page.project.description || 'No description'}
                </Typography>
              </header>

              {/* Stats */}
              <GridPanel columns="grid-cols-1 sm:grid-cols-3" className="mb-6">
                <GridCell className="flex flex-col gap-1 p-4">
                  <Typography tone="muted" variant="body-sm">Endpoints</Typography>
                  <Typography variant="heading-md" as="p" className="font-mono">
                    {page.endpoints.length}
                  </Typography>
                </GridCell>
                <GridCell className="flex flex-col gap-1 p-4">
                  <Typography tone="muted" variant="body-sm">Tags</Typography>
                  <Typography variant="heading-md" as="p" className="font-mono">
                    {page.tags.length}
                  </Typography>
                </GridCell>
                <GridCell className="flex flex-col gap-1 p-4">
                  <Typography tone="muted" variant="body-sm">Version</Typography>
                  <Typography variant="heading-md" as="p" className="font-mono">
                    {page.project.version ?? '-'}
                  </Typography>
                </GridCell>
              </GridPanel>

              {/* Overview of grouped endpoints */}
              {groups.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <FolderOpen className="mb-3 h-10 w-10 text-text-muted" aria-hidden="true" />
                  <Typography variant="heading-sm" tone="secondary" className="mb-2">
                    No endpoints yet
                  </Typography>
                  <Typography variant="body-sm" tone="muted" className="mb-5">
                    This project has no endpoints defined
                  </Typography>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {groups.map((group) => (
                    <section key={group.name}>
                      <Typography variant="label" tone="muted" className="mb-2 uppercase tracking-wide">
                        {group.name}
                      </Typography>
                      <GridPanel columns="grid-cols-1">
                        {group.endpoints.map((ep) => (
                          <GridCell
                            key={ep.id}
                            className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-card"
                            onClick={() => page.handleSelectEndpoint(ep.id)}
                          >
                            <span
                              className={`method-badge badge-${ep.method.toLowerCase()}`}
                              aria-hidden="true"
                            >
                              {ep.method}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-text-secondary">
                              {ep.path}
                            </span>
                            <span className="truncate text-[13px] text-text-muted">
                              {ep.summary}
                            </span>
                          </GridCell>
                        ))}
                      </GridPanel>
                    </section>
                  ))}
                </div>
              )}
            </PageContainer>
          ) : null}
        </main>
      </div>
      {page.itemDialog && (
        <ProjectItemModal
          key={`${page.itemDialog.type}-${'folderId' in page.itemDialog ? page.itemDialog.folderId : 'endpointId' in page.itemDialog ? page.itemDialog.endpointId : page.itemDialog.parentId ?? 'root'}`}
          dialog={page.itemDialog}
          onClose={page.closeItemDialog}
          onSubmit={page.submitItemDialog}
        />
      )}
    </div>
  )
}