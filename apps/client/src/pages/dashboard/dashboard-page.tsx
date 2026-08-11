import { useRef, useState } from 'react';
import {
  Check,
  FolderOpen,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar, Button, GridCell, GridPanel, PageContainer, Typography } from '../../components/ui';
import { DashboardTopbar } from '../../components/DashboardTopbar';
import { ImportYamlModal } from '../../components/ImportYamlModal';
import type { ProjectDto } from '../../lib/api';
import { CreateProjectModal } from './create-project-modal';
import useDashboardPage from './use-dashboard-page';
import { McpConnectionPanel } from './mcp-connection-panel';

export default function DashboardPage() {
  const page = useDashboardPage();

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

      {/* Project grid */}
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
        <GridPanel columns="sm:col-span-2 lg:grid-cols-4">
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
        <GridPanel columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {page.projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={() => page.selectProject(p.id)}
              onDelete={(e) => {
                e.stopPropagation();
                page.removeProject(p.id);
              }}
              onRename={(newName) => page.renameSelectedProject(p.id, newName)}
            />
          ))}
        </GridPanel>
      )}

      {/* Import YAML modal */}
      {page.showImport && (
        <ImportYamlModal onClose={page.closeImport} onImported={page.onImported} />
      )}

      {page.showCreate && (
        <CreateProjectModal onClose={page.closeCreate} onCreate={page.createProject} />
      )}
      </PageContainer>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <GridCell className="p-4" aria-hidden="true">
      <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-overlay" />
      <div className="mb-4 h-3 w-1/3 animate-pulse rounded bg-overlay" />
      <div className="h-8 w-24 animate-pulse rounded-none bg-overlay" />
    </GridCell>
  );
}

function ProjectCard({
  project,
  onSelect,
  onDelete,
  onRename,
}: {
  project: ProjectDto;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const [prevName, setPrevName] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft when project name changes externally (render-phase adjustment).
  if (prevName !== project.name) {
    setPrevName(project.name);
    setDraft(project.name);
  }

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(project.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== project.name) {
      onRename(draft.trim());
    } else {
      setDraft(project.name);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(project.name);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <GridCell
      onClick={editing ? undefined : onSelect}
      className="p-4 cursor-pointer hover:bg-card transition-colors"
      aria-label={editing ? `Renaming ${project.name}` : `Open project ${project.name}`}
    >
      {/* Name row */}
      <div className="mb-3.5 flex items-start justify-between gap-2">
        {editing ? (
          <div
            className="flex min-w-0 flex-1 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onKeyDown}
              aria-label="Project name"
              className="min-w-0 flex-1 rounded-none border border-primary bg-overlay px-2 py-1 text-[15px] font-semibold text-text-primary outline-none"
            />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Save name (Enter)"
              onMouseDown={(e) => {
                e.preventDefault();
                commitEdit();
              }}
            >
              <Check className="h-4 w-4 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Cancel (Esc)"
              onMouseDown={(e) => {
                e.preventDefault();
                cancelEdit();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Typography as="h3" variant="heading-sm" className="truncate">
              {project.name}
            </Typography>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Rename project ${project.name}`}
              onClick={startEdit}
              className="opacity-40 hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center gap-3 border-y border-border py-3">
        <Avatar
          size="sm"
          src={project.creator?.profilePicture}
          alt={project.creator?.name ?? 'Unknown creator'}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-text-primary">{project.creator?.name ?? 'Unknown creator'}</p>
          <p className="truncate text-[11px] text-text-muted">{project.creator?.email ?? 'Creator account unavailable'}</p>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex">
        <Typography variant="caption" tone="muted" className="self-center">
          Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}
        </Typography>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          className="ml-auto"
          title="Delete project"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </GridCell>
  );
}
