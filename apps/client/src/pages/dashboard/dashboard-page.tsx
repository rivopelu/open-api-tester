import { useState } from 'react';
import {
  FolderOpen,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Avatar, Button, GridCell, GridPanel, PageContainer, Typography } from '../../components/ui';
import { DashboardTopbar } from '../../components/DashboardTopbar';
import { ImportYamlModal } from '../../components/ImportYamlModal';
import type { ProjectDto } from '../../lib/api';
import { CreateProjectModal } from './create-project-modal';
import { EditProjectModal } from './edit-project-modal';
import useDashboardPage from './use-dashboard-page';
import { McpConnectionPanel } from './mcp-connection-panel';

function formatTimeAgo(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const timestamp = new Date(dateInput).getTime();
  if (Number.isNaN(timestamp)) return '—';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function DashboardPage() {
  const page = useDashboardPage();
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-32 top-12 h-[420px] w-[620px] rotate-[-12deg] animate-[pulse_9s_ease-in-out_infinite] border border-primary/10 bg-primary/[0.025] motion-reduce:animate-none" />
        <div className="absolute -right-12 top-48 h-[320px] w-[440px] rotate-[18deg] animate-[pulse_12s_ease-in-out_infinite] border border-purple/10 bg-purple/[0.025] motion-reduce:animate-none" />
        <div className="absolute -left-40 top-[420px] h-[360px] w-[560px] rotate-[8deg] animate-[pulse_14s_ease-in-out_infinite] border border-teal/10 bg-teal/[0.02] motion-reduce:animate-none" />
        <svg className="absolute right-[7%] top-24 h-[360px] w-[560px] animate-[pulse_10s_ease-in-out_infinite] opacity-25 motion-reduce:animate-none" viewBox="0 0 560 360" fill="none">
          <path d="M24 292C112 292 108 104 218 104S322 252 418 252s84-188 126-188" stroke="#89b4fa" strokeOpacity=".22" />
          <path d="M2 326C124 326 132 152 250 152s118 132 206 132 68-92 104-92" stroke="#94e2d5" strokeOpacity=".15" />
          <circle className="animate-pulse motion-reduce:animate-none" cx="218" cy="104" r="4" fill="#89b4fa" fillOpacity=".45" />
          <circle className="animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none" cx="418" cy="252" r="4" fill="#cba6f7" fillOpacity=".4" />
        </svg>
      </div>
      <DashboardTopbar
        onCreateProject={page.handleCreateClick}
        onOpenImport={page.openImport}
      />
      <PageContainer size="lg" className="relative z-10">
        {/* Header */}
        <header className="mb-8">
          <Typography variant="heading-lg" as="h1">
            {page.headline}
          </Typography>
          <Typography tone="muted" variant="body-sm">
            {page.subtitle}
          </Typography>
        </header>

        <McpConnectionPanel />

        {/* Stats — 2 items only, use 2-col grid */}
        <GridPanel columns="grid-cols-1 sm:grid-cols-2" className="mb-8">
          {page.stats.map((stat) => (
            <GridCell key={stat.key} className="p-5 flex flex-col gap-1">
              <Typography tone="muted" variant="body-sm">
                {stat.label}
              </Typography>
              <Typography variant="heading-md" as="p" className="font-mono">
                {stat.value}
              </Typography>
            </GridCell>
          ))}
        </GridPanel>

        <section aria-labelledby="projects-heading">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <Typography id="projects-heading" as="h2" variant="heading-sm">
                Your projects
              </Typography>
              <Typography variant="body-sm" tone="muted">
                Open a workspace or manage its details.
              </Typography>
            </div>
            {!page.loading && page.projects.length > 0 && (
              <Typography variant="caption" tone="muted" className="shrink-0 font-mono">
                {page.projects.length} {page.projects.length === 1 ? 'project' : 'projects'}
              </Typography>
            )}
          </div>

          {page.loading ? (
            <GridPanel
              columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"
              className="mb-8"
              role="status"
              aria-label="Loading projects"
            >
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
              <ProjectCardSkeleton />
            </GridPanel>
          ) : page.projects.length === 0 ? (
            <GridPanel columns="sm:col-span-2 lg:grid-cols-4" className="mb-8">
              <GridCell className="sm:col-span-2 lg:col-span-4 flex flex-col items-center py-14 text-center">
                <FolderOpen
                  className="mb-3 h-10 w-10 text-text-muted"
                  aria-hidden="true"
                />
                <Typography variant="heading-sm" tone="secondary" className="mb-2">
                  No projects yet
                </Typography>
                <Typography variant="body-sm" tone="muted" className="mb-5">
                  Create your first API project to get started
                </Typography>
                <Button variant="primary" onClick={page.handleCreateClick}>
                  Create your first API
                </Button>
              </GridCell>
            </GridPanel>
          ) : (
            <GridPanel columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]" className="mb-8">
              {page.projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onSelect={() => page.selectProject(p.id)}
                  onDelete={() => page.removeProject(p.id)}
                  onEdit={() => setEditingProject(p)}
                />
              ))}
            </GridPanel>
          )}
        </section>

        {/* Import YAML modal */}
        {page.showImport && (
          <ImportYamlModal onClose={page.closeImport} onImported={page.onImported} />
        )}

        {page.showCreate && (
          <CreateProjectModal onClose={page.closeCreate} onCreate={page.createProject} />
        )}
        {editingProject && (
          <EditProjectModal
            projectName={editingProject.name}
            onClose={() => setEditingProject(null)}
            onSave={(name) => page.renameSelectedProject(editingProject.id, name)}
          />
        )}
      </PageContainer>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <GridCell className="flex min-h-[160px] flex-col justify-between p-4" aria-hidden="true">
      <div className="h-5 w-48 max-w-[75%] animate-pulse bg-overlay" />
      <div className="my-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-pulse bg-overlay" />
          <div className="h-3 w-20 animate-pulse bg-overlay" />
        </div>
        <div className="h-3 w-14 animate-pulse bg-overlay" />
      </div>
      <div className="h-8 w-full animate-pulse bg-overlay" />
    </GridCell>
  );
}

function ProjectCard({
  project,
  onSelect,
  onDelete,
  onEdit,
}: {
  project: ProjectDto;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const actorName = project.creator?.name ?? 'Unknown';

  return (
    <GridCell
      onClick={onSelect}
      className="group flex min-h-[160px] cursor-pointer flex-col justify-between p-4 transition-colors duration-200 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Open project ${project.name}`}
    >
      <div className="w-full text-left">
        <Typography as="h3" variant="heading-sm" className="break-words group-hover:text-primary">
          {project.name}
        </Typography>
      </div>

      <div className="my-3 flex items-center justify-between gap-3 border-t border-border/80 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            size="sm"
            src={project.creator?.profilePicture}
            alt={actorName}
          />
          <Typography variant="caption" tone="secondary" className="truncate font-medium">
            {actorName}
          </Typography>
        </div>
        <Typography variant="caption" tone="muted" className="shrink-0 font-mono">
          {formatTimeAgo(project.updatedAt)}
        </Typography>
      </div>

      <div
        className="flex border border-border bg-overlay"
        aria-label={`Actions for ${project.name}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex-1 border-r border-border"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-1 text-danger hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </GridCell>
  );
}
