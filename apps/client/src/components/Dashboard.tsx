import { useEffect, useRef, useState } from 'react';
import { FolderOpen, LogOut, Pencil, Plus, Trash2, Upload, X, Zap, Check } from 'lucide-react';
import { projectApi, getErrorMessage, type ProjectDto } from '../lib/api';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useAuthStore } from '../store/useAuthStore';
import { ImportYamlModal } from './ImportYamlModal';
import { Button, Card, Typography } from './ui';
import toast from 'react-hot-toast';

export function Dashboard({ onProjectSelect }: { onProjectSelect: () => void }) {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const { loadProject, createNewProject, deleteProject, renameProject } = useApiSpecStore();
  const { signOut } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    projectApi.list()
      .then((items) => { if (!cancelled) setProjects(items); })
      .catch((err: unknown) => {
        console.error('[fetchProjects]', err);
        toast.error(getErrorMessage(err, 'Failed to load projects'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    const name = window.prompt('Enter project name:', 'New API Project');
    if (!name) return;
    const ok = await createNewProject(name);
    if (ok) onProjectSelect();
  };

  const handleSelect = async (p: ProjectDto) => {
    await loadProject(p.id);
    onProjectSelect();
  };

  const handleSignOut = () => {
    signOut();
  };

  const handleDelete = async (e: React.MouseEvent, p: ProjectDto) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${p.name}"? This action cannot be undone.`)) return;
    const ok = await deleteProject(p.id);
    if (ok) {
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Project deleted');
    }
  };

  const handleRename = async (p: ProjectDto, newName: string) => {
    if (newName.trim() === p.name || !newName.trim()) return;
    const ok = await renameProject(p.id, newName);
    if (ok) {
      setProjects((prev) => prev.map((x) => x.id === p.id ? { ...x, name: newName.trim() } : x));
      toast.success('Project renamed');
    }
  };

  return (
    <div className="mx-auto max-w-[860px] animate-fadeIn p-10">
      {/* Header */}
      <header className="mb-9 flex items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <div className="glow-blue grid h-9 w-9 place-items-center rounded-lg bg-linear-to-br from-primary to-purple">
              <Zap className="h-4 w-4 text-base" aria-hidden="true" />
            </div>
            <Typography variant="heading-lg" as="h1">
              Max API Studio
            </Typography>
          </div>
          <Typography tone="muted" variant="body-sm">Office API projects</Typography>
        </div>
        <div className="flex gap-2.5">
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign Out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowImport(true)}
            title="Import an OpenAPI YAML or JSON file as a new project"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Import YAML
          </Button>
          <Button variant="primary" size="sm" onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Project
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5" role="status" aria-label="Loading projects">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-center py-14 text-center">
          <FolderOpen className="mb-3 h-10 w-10 text-text-muted" aria-hidden="true" />
          <Typography variant="heading-sm" tone="secondary" className="mb-2">No projects yet</Typography>
          <Typography variant="body-sm" tone="muted" className="mb-5">Create your first API project</Typography>
          <Button variant="primary" onClick={handleCreate}>Create your first API</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={() => handleSelect(p)}
              onDelete={(e) => handleDelete(e, p)}
              onRename={(newName) => handleRename(p, newName)}
            />
          ))}
        </div>
      )}

      {/* Import YAML modal */}
      {showImport && (
        <ImportYamlModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            onProjectSelect();
          }}
        />
      )}
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4" aria-hidden="true">
      <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-overlay" />
      <div className="mb-4 h-3 w-1/3 animate-pulse rounded bg-overlay" />
      <div className="h-8 w-24 animate-pulse rounded-md bg-overlay" />
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete, onRename }: {
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
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  return (
    <Card
      interactive
      padding="sm"
      onClick={editing ? undefined : onSelect}
      className="hover:border-primary/50"
      aria-label={editing ? `Renaming ${project.name}` : `Open project ${project.name}`}
    >
      {/* Name row */}
      <div className="mb-3.5 flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onKeyDown}
              aria-label="Project name"
              className="min-w-0 flex-1 rounded-md border border-primary bg-overlay px-2 py-1 text-[15px] font-semibold text-text-primary outline-none"
            />
            <Button variant="ghost" size="sm" iconOnly aria-label="Save name (Enter)" onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}>
              <Check className="h-4 w-4 text-success" />
            </Button>
            <Button variant="ghost" size="sm" iconOnly aria-label="Cancel (Esc)" onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Typography
              as="h3"
              variant="heading-sm"
              className="truncate"
            >
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

      {/* Updated date */}
      <Typography variant="body-sm" tone="muted" className="mb-3.5">
        Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}
      </Typography>

      {/* Footer actions */}
      <div className="flex">
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
    </Card>
  );
}
