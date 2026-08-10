import { useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useUiStore } from '../store/useUiStore';
import { router } from '../routes';
import { Button, Input } from './ui';
import { cn } from '../lib/utils';

export function Sidebar() {
  const { spec, activeEndpointId, setActiveEndpoint, addEndpoint, searchQuery, setSearchQuery, filterTag, setFilterTag } = useApiSpecStore();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const navigate = useNavigate();
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set(['Users', 'Products', 'Authentication']));

  const filtered = spec.endpoints.filter((ep) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || ep.path.toLowerCase().includes(q) || ep.summary?.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q);
    const matchTag = !filterTag || ep.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  // Group by tag
  const groups: Record<string, typeof filtered> = { Untagged: [] };
  for (const tag of spec.tags) groups[tag.name] = [];
  for (const ep of filtered) {
    if (ep.tags.length === 0) groups['Untagged'].push(ep);
    else ep.tags.forEach((t) => { if (groups[t]) groups[t].push(ep); else groups['Untagged'].push(ep); });
  }

  const toggleTag = (name: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleDeleteTag = (id: string, name: string) => {
    if (!window.confirm(`Delete tag "${name}"?`)) return;
    useApiSpecStore.getState().deleteTag(id);
    if (filterTag === name) setFilterTag(null);
  };

  const handleAddTag = () => {
    const name = window.prompt('Enter new tag name:');
    if (name) { useApiSpecStore.getState().addTag({ name }); setFilterTag(name); }
  };

  if (sidebarCollapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-surface py-2">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Expand sidebar"
          onClick={toggleSidebar}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-border bg-surface">
      {/* Sidebar header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <Input
            size="sm"
            leadingIcon={<Search className="h-3.5 w-3.5" />}
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search endpoints"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Collapse sidebar"
          onClick={toggleSidebar}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Tag filter */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-1.5">
        <button
          type="button"
          className={cn('btn btn-sm', !filterTag ? 'btn-primary' : 'btn-ghost')}
          onClick={() => setFilterTag(null)}
        >
          All
        </button>
        {spec.tags.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center overflow-hidden rounded-md border',
              filterTag === t.name ? 'border-primary/40 bg-primary/15' : 'border-border bg-overlay',
            )}
          >
            <button
              type="button"
              className={cn('btn btn-sm border-0', filterTag === t.name ? 'btn-primary' : 'btn-ghost')}
              onClick={() => setFilterTag(filterTag === t.name ? null : t.name)}
            >
              {t.name}
            </button>
            <button
              type="button"
              aria-label={`Delete tag ${t.name}`}
              className="btn btn-ghost btn-sm border-l border-border text-danger"
              onClick={() => handleDeleteTag(t.id, t.name)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button variant="ghost" size="sm" iconOnly aria-label="Add tag" onClick={handleAddTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Endpoint list */}
      <div className="scroll-y flex-1 py-2">
        {Object.entries(groups).filter(([, eps]) => eps.length > 0).map(([tag, eps]) => (
          <div key={tag} className="mb-1">
            {/* Tag header */}
            <button
              type="button"
              onClick={() => toggleTag(tag)}
              aria-expanded={expandedTags.has(tag)}
              className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted transition-colors duration-150 hover:text-text-secondary"
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight
                  className={cn('h-3 w-3 text-purple transition-transform duration-150', expandedTags.has(tag) && 'rotate-90')}
                  aria-hidden="true"
                />
                {tag}
              </span>
              <span className="rounded-full bg-overlay px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal">
                {eps.length}
              </span>
            </button>

            {/* Endpoints */}
            {expandedTags.has(tag) && (
              <ul className="flex flex-col">
                {eps.map((ep) => (
                  <li key={ep.id}>
                    <button
                      type="button"
                      onClick={() => { setActiveEndpoint(ep.id); navigate(router.editor.panel('designer')); }}
                      className={cn('sidebar-item pl-5', activeEndpointId === ep.id && 'active')}
                    >
                      <span className={cn('method-badge', `badge-${ep.method.toLowerCase()}`)}>{ep.method}</span>
                      <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', !ep.summary && 'font-mono font-normal')}>
                        {ep.summary || ep.path}
                      </span>
                      {ep.security && ep.security.length > 0 && (
                        <Lock className="h-3 w-3 shrink-0 text-warning" aria-label="Requires authentication" />
                      )}
                      {ep.deprecated && (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-warning" aria-label="Deprecated" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Footer buttons */}
      <div className="flex flex-col gap-1.5 border-t border-border p-2.5">
        <Button variant="primary" size="sm" className="w-full" onClick={() => addEndpoint()}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Endpoint
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-danger"
          onClick={() => {
            if (window.confirm('Are you sure you want to delete ALL endpoints?')) {
              useApiSpecStore.getState().clearEndpoints();
            }
          }}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear All
        </Button>
      </div>
    </aside>
  );
}
