import { useEffect, useRef, useState } from 'react';
import { projectApi, getErrorMessage, type ProjectDto } from '../lib/api';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useAuthStore } from '../store/useAuthStore';
import { ImportYamlModal } from './ImportYamlModal';
import toast from 'react-hot-toast';

export function Dashboard({ onProjectSelect }: { onProjectSelect: () => void }) {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const { loadProject, createNewProject, deleteProject, renameProject } = useApiSpecStore();
  const { signOut } = useAuthStore();

  const fetchProjects = async () => {
    try {
      const items = await projectApi.list();
      setProjects(items);
    } catch (err: unknown) {
      console.error('[fetchProjects]', err);
      toast.error(getErrorMessage(err, 'Failed to load projects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

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
    <div style={{ padding: 40, maxWidth: 860, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 0 16px rgba(137,180,250,0.3)',
            }}>⚡</div>
            <h1 style={{ fontSize: 24, margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>API Studio</h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Office API projects</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowImport(true)}
            title="Import an OpenAPI YAML or JSON file as a new project"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📥 Import YAML
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>+ New Project</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Create your first API project</div>
          <button className="btn btn-primary" onClick={handleCreate}>Create your first API</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
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
    <div
      className="card"
      onClick={editing ? undefined : onSelect}
      style={{ cursor: editing ? 'default' : 'pointer', padding: 18, transition: 'var(--transition)', position: 'relative' }}
      onMouseEnter={(e) => { if (!editing) (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
    >
      {/* Name row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        {editing ? (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onKeyDown}
              style={{
                flex: 1, fontSize: 15, fontWeight: 600,
                background: 'var(--bg-overlay)', border: '1px solid var(--accent-blue)',
                borderRadius: 6, padding: '3px 8px', color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}
              style={{ color: 'var(--accent-green)', fontSize: 13 }}
              title="Save (Enter)"
            >✓</button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onMouseDown={(e) => { e.preventDefault(); cancelEdit(); }}
              style={{ fontSize: 11 }}
              title="Cancel (Esc)"
            >✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </h3>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={startEdit}
              title="Rename project"
              style={{ opacity: 0.4, fontSize: 11, flexShrink: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.4')}
            >
              ✎
            </button>
          </div>
        )}
      </div>

      {/* Updated date */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : '—'}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          style={{ fontSize: 11, marginLeft: 'auto' }}
          data-tooltip="Delete project"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}