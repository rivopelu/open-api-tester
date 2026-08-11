import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { Endpoint } from '@modern-api-studio/types';
import type { EndpointDto, EndpointFolderDto } from '../lib/api';
import {
  AlertTriangle,
  ChevronRight,
  Folder,
  FolderPlus,
  Lock,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { Input } from './ui';
import { cn } from '../lib/utils';

export interface EndpointListSidebarProps {
  endpoints: Endpoint[];
  endpointDtos: EndpointDto[];
  folders: EndpointFolderDto[];
  activeEndpointId?: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameEndpoint: (endpointId: string, currentName: string) => void;
  onMoveEndpoint: (endpointId: string, folderId: string | null) => void;
  className?: string;
}

type MenuState =
  | { type: 'folder'; id: string; x: number; y: number }
  | { type: 'endpoint'; id: string; x: number; y: number }
  | { type: 'root'; x: number; y: number }
  | null;

export function EndpointListSidebar({
  endpoints,
  endpointDtos,
  folders,
  activeEndpointId,
  onSelectEndpoint,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameEndpoint,
  onMoveEndpoint,
  className,
}: EndpointListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(folders.map((folder) => folder.id)),
  );
  const [menu, setMenu] = useState<MenuState>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(null);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);

  const endpointById = useMemo(
    () => new Map(endpoints.map((endpoint) => [endpoint.id, endpoint])),
    [endpoints],
  );

  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const query = searchQuery.trim().toLowerCase();

  const foldersByParent = useMemo(() => {
    const map = new Map<string | null, EndpointFolderDto[]>();
    for (const folder of folders) {
      const siblings = map.get(folder.parentId) ?? [];
      siblings.push(folder);
      map.set(folder.parentId, siblings);
    }
    for (const siblings of map.values()) siblings.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  const endpointsByFolder = useMemo(() => {
    const map = new Map<string | null, Endpoint[]>();
    for (const dto of endpointDtos) {
      const endpoint = endpointById.get(dto.id);
      const matches = endpoint && (
        !query ||
        endpoint.path.toLowerCase().includes(query) ||
        endpoint.summary?.toLowerCase().includes(query) ||
        endpoint.method.toLowerCase().includes(query) ||
        endpoint.operationId?.toLowerCase().includes(query)
      );
      if (!endpoint || !matches) continue;
      const siblings = map.get(dto.folderId) ?? [];
      siblings.push(endpoint);
      map.set(dto.folderId, siblings);
    }
    return map;
  }, [endpointById, endpointDtos, query]);

  const openMenu = (
    event: MouseEvent,
    next: { type: 'folder'; id: string } | { type: 'endpoint'; id: string } | { type: 'root' },
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ ...next, x: event.clientX, y: event.clientY } as MenuState);
  };
  const action = (callback: () => void) => {
    setMenu(null);
    callback();
  };
  const toggleFolder = (id: string) => setExpandedFolders((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderEndpoint = (endpoint: Endpoint, depth: number) => (
    <button
      key={endpoint.id}
      type="button"
      onClick={() => onSelectEndpoint(endpoint.id)}
      onContextMenu={(event) => openMenu(event, { type: 'endpoint', id: endpoint.id })}
      className={cn('sidebar-item', activeEndpointId === endpoint.id && 'active')}
      style={{ paddingLeft: 20 + depth * 14 }}
    >
      <span className={cn('method-badge', `badge-${endpoint.method.toLowerCase()}`)}>{endpoint.method}</span>
      <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', !endpoint.summary && 'font-mono font-normal')}>
        {endpoint.summary || endpoint.path}
      </span>
      {endpoint.security && endpoint.security.length > 0 && <Lock className="h-3 w-3 shrink-0 text-warning" />}
      {endpoint.deprecated && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
    </button>
  );

  const renderFolder = (folder: EndpointFolderDto, depth: number): ReactNode => {
    const children = foldersByParent.get(folder.id) ?? [];
    const ownEndpoints = endpointsByFolder.get(folder.id) ?? [];
    const expanded = expandedFolders.has(folder.id) || Boolean(query);
    return (
      <div key={folder.id}>
        <button
          type="button"
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(event) => openMenu(event, { type: 'folder', id: folder.id })}
          className="flex w-full items-center gap-1.5 py-1.5 pr-3 text-xs font-semibold text-text-secondary hover:bg-overlay"
          style={{ paddingLeft: 10 + depth * 14 }}
        >
          <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
          <Folder className="h-3.5 w-3.5 text-purple" />
          <span className="truncate">{folder.name}</span>
        </button>
        {expanded && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
            {ownEndpoints.map((endpoint) => renderEndpoint(endpoint, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootEndpoints = endpointsByFolder.get(null) ?? [];
  const rootFolders = foldersByParent.get(null) ?? [];
  const hasResults = rootEndpoints.length > 0 || rootFolders.length > 0;
  const selectedMenuFolder = menu?.type === 'folder' ? folderById.get(menu.id) : null;
  const selectedMenuEndpoint = menu?.type === 'endpoint' ? endpointById.get(menu.id) : null;

  return (
    <aside className={cn('flex w-[280px] shrink-0 flex-col border-r border-border bg-surface', className)}>
      <div className="border-b border-border p-2.5">
        <Input size="sm" leadingIcon={<Search className="h-3.5 w-3.5" />} placeholder="Search endpoints..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>
      <div className="scroll-y flex-1 py-2" onContextMenu={(event) => openMenu(event, { type: 'root' })}>
        {!hasResults && <p className="px-3 py-2 text-xs text-text-muted">No endpoints or folders found</p>}
        {rootFolders.map((folder) => renderFolder(folder, 0))}
        {rootEndpoints.map((endpoint) => renderEndpoint(endpoint, 0))}
      </div>

      {menu && (
        <div ref={menuRef} role="menu" className="fixed z-[200] min-w-[190px] border border-border bg-surface p-1.5" style={{ left: menu.x, top: menu.y }}>
          {(menu.type === 'root' || menu.type === 'folder') && (
            <button className="sidebar-item" role="menuitem" onClick={() => action(() => onCreateFolder(menu.type === 'folder' ? menu.id : null))}>
              <FolderPlus className="h-3.5 w-3.5" /> Add folder
            </button>
          )}
          {selectedMenuFolder && (
            <>
              <button className="sidebar-item" role="menuitem" onClick={() => action(() => onRenameFolder(selectedMenuFolder.id, selectedMenuFolder.name))}>
                <Pencil className="h-3.5 w-3.5" /> Rename folder
              </button>
              <button className="sidebar-item text-danger" role="menuitem" onClick={() => action(() => onDeleteFolder(selectedMenuFolder.id))}>
                <Trash2 className="h-3.5 w-3.5" /> Delete folder
              </button>
            </>
          )}
          {selectedMenuEndpoint && (
            <>
              <button className="sidebar-item" role="menuitem" onClick={() => action(() => onRenameEndpoint(selectedMenuEndpoint.id, selectedMenuEndpoint.summary || selectedMenuEndpoint.path))}>
                <Pencil className="h-3.5 w-3.5" /> Rename endpoint
              </button>
              <button className="sidebar-item" role="menuitem" onClick={() => action(() => onMoveEndpoint(selectedMenuEndpoint.id, null))}>Move to root</button>
              {folders.map((folder) => (
                <button key={folder.id} className="sidebar-item" role="menuitem" onClick={() => action(() => onMoveEndpoint(selectedMenuEndpoint.id, folder.id))}>
                  <Folder className="h-3.5 w-3.5" /> Move to {folder.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
