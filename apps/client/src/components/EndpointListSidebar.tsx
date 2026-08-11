import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import {
  DndContext,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Endpoint } from '@modern-api-studio/types';
import type { EndpointDto, EndpointFolderDto } from '../lib/api';
import {
  AlertTriangle,
  ChevronRight,
  FilePlus2,
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
  onCreateEndpoint: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
  onRenameEndpoint: (endpointId: string, currentName: string) => void;
  onMoveEndpoint: (endpointId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  className?: string;
}

type MenuState =
  | { type: 'folder'; id: string; x: number; y: number }
  | { type: 'endpoint'; id: string; x: number; y: number }
  | { type: 'root'; x: number; y: number }
  | null;

type DragItem =
  | { type: 'endpoint'; id: string; folderId: string | null }
  | { type: 'folder'; id: string; parentId: string | null };

function getDragStyle(transform: { x: number; y: number } | null, isDragging: boolean): CSSProperties {
  return {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.55 : undefined,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };
}

interface EndpointRowProps {
  endpoint: Endpoint;
  folderId: string | null;
  depth: number;
  active: boolean;
  onSelect: () => void;
  onContextMenu: (event: MouseEvent) => void;
}

function EndpointRow({ endpoint, folderId, depth, active, onSelect, onContextMenu }: EndpointRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `endpoint:${endpoint.id}`,
    data: { type: 'endpoint', id: endpoint.id, folderId } satisfies DragItem,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      onContextMenu={onContextMenu}
      className={cn('sidebar-item cursor-grab touch-none active:cursor-grabbing', active && 'active')}
      style={{ ...getDragStyle(transform, isDragging), paddingLeft: 20 + depth * 14 }}
      {...listeners}
      {...attributes}
    >
      <span className={cn('method-badge', `badge-${endpoint.method.toLowerCase()}`)}>{endpoint.method}</span>
      <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', !endpoint.summary && 'font-mono font-normal')}>
        {endpoint.summary || endpoint.path}
      </span>
      {endpoint.security && endpoint.security.length > 0 && <Lock className="h-3 w-3 shrink-0 text-warning" />}
      {endpoint.deprecated && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
    </button>
  );
}

interface FolderRowProps {
  folder: EndpointFolderDto;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  onContextMenu: (event: MouseEvent) => void;
}

function FolderRow({ folder, depth, expanded, onToggle, onContextMenu }: FolderRowProps) {
  const draggable = useDraggable({
    id: `folder:${folder.id}`,
    data: { type: 'folder', id: folder.id, parentId: folder.parentId } satisfies DragItem,
  });
  const droppable = useDroppable({ id: `drop-folder:${folder.id}`, data: { folderId: folder.id } });
  const setNodeRef = (node: HTMLButtonElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onToggle}
      onContextMenu={onContextMenu}
      className={cn(
        'flex w-full touch-none items-center gap-1.5 py-1.5 pr-3 text-xs font-semibold text-text-secondary hover:bg-overlay',
        'cursor-grab active:cursor-grabbing',
        droppable.isOver && !draggable.isDragging && 'bg-primary/15 text-primary outline outline-1 outline-inset outline-primary/50',
      )}
      style={{ ...getDragStyle(draggable.transform, draggable.isDragging), paddingLeft: 10 + depth * 14 }}
      {...draggable.listeners}
      {...draggable.attributes}
    >
      <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
      <Folder className="h-3.5 w-3.5 text-purple" />
      <span className="truncate">{folder.name}</span>
    </button>
  );
}

function RootDropZone({ visible }: { visible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'drop-root', data: { folderId: null } });
  if (!visible) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'mx-2 mb-2 border border-dashed border-border px-3 py-2 text-center text-xs text-text-muted',
        isOver && 'border-primary bg-primary/10 text-primary',
      )}
    >
      Move to project root
    </div>
  );
}

export function EndpointListSidebar({
  endpoints,
  endpointDtos,
  folders,
  activeEndpointId,
  onSelectEndpoint,
  onCreateEndpoint,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameEndpoint,
  onMoveEndpoint,
  onMoveFolder,
  className,
}: EndpointListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(folders.map((folder) => folder.id)),
  );
  const [menu, setMenu] = useState<MenuState>(null);
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
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
  const createInFolder = (folderId: string | null, type: 'endpoint' | 'folder') => {
    if (folderId) {
      setExpandedFolders((current) => new Set(current).add(folderId));
    }
    action(() => type === 'endpoint' ? onCreateEndpoint(folderId) : onCreateFolder(folderId));
  };
  const toggleFolder = (id: string) => setExpandedFolders((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current as DragItem | undefined;
    setActiveDrag(item ?? null);
    setMenu(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const item = event.active.data.current as DragItem | undefined;
    const targetFolderId = event.over?.data.current?.folderId as string | null | undefined;
    setActiveDrag(null);

    if (!item || targetFolderId === undefined) return;
    if (item.type === 'endpoint') {
      if (item.folderId !== targetFolderId) onMoveEndpoint(item.id, targetFolderId);
      return;
    }

    if (item.id !== targetFolderId && item.parentId !== targetFolderId) {
      onMoveFolder(item.id, targetFolderId);
      if (targetFolderId) {
        setExpandedFolders((current) => new Set(current).add(targetFolderId));
      }
    }
  };

  const renderEndpoint = (endpoint: Endpoint, folderId: string | null, depth: number) => (
    <EndpointRow
      key={endpoint.id}
      endpoint={endpoint}
      folderId={folderId}
      depth={depth}
      active={activeEndpointId === endpoint.id}
      onSelect={() => onSelectEndpoint(endpoint.id)}
      onContextMenu={(event) => openMenu(event, { type: 'endpoint', id: endpoint.id })}
    />
  );

  const renderFolder = (folder: EndpointFolderDto, depth: number): ReactNode => {
    const children = foldersByParent.get(folder.id) ?? [];
    const ownEndpoints = endpointsByFolder.get(folder.id) ?? [];
    const expanded = expandedFolders.has(folder.id) || Boolean(query);
    return (
      <div key={folder.id}>
        <FolderRow
          folder={folder}
          depth={depth}
          expanded={expanded}
          onToggle={() => toggleFolder(folder.id)}
          onContextMenu={(event) => openMenu(event, { type: 'folder', id: folder.id })}
        />
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
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveDrag(null)}
      onDragEnd={handleDragEnd}
    >
    <aside className={cn('flex w-[280px] shrink-0 flex-col border-r border-border bg-surface', className)}>
      <div className="border-b border-border p-2.5">
        <Input size="sm" leadingIcon={<Search className="h-3.5 w-3.5" />} placeholder="Search endpoints..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>
      <div className="scroll-y flex-1 py-2" onContextMenu={(event) => openMenu(event, { type: 'root' })}>
        <RootDropZone visible={activeDrag !== null} />
        {!hasResults && <p className="px-3 py-2 text-xs text-text-muted">No endpoints or folders found</p>}
        {rootFolders.map((folder) => renderFolder(folder, 0))}
        {rootEndpoints.map((endpoint) => renderEndpoint(endpoint, 0))}
      </div>

      {menu && (
        <div ref={menuRef} role="menu" className="fixed z-[200] min-w-[190px] border border-border bg-surface p-1.5" style={{ left: menu.x, top: menu.y }}>
          {(menu.type === 'root' || menu.type === 'folder') && (
            <>
              <button
                className="sidebar-item"
                role="menuitem"
                onClick={() => createInFolder(menu.type === 'folder' ? menu.id : null, 'endpoint')}
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Create Request
              </button>
              <button
                className="sidebar-item"
                role="menuitem"
                onClick={() => createInFolder(menu.type === 'folder' ? menu.id : null, 'folder')}
              >
                <FolderPlus className="h-3.5 w-3.5" /> Create Folder
              </button>
            </>
          )}
          {selectedMenuFolder && (
            <>
              <button className="sidebar-item" role="menuitem" onClick={() => action(() => onRenameFolder(selectedMenuFolder.id, selectedMenuFolder.name))}>
                <Pencil className="h-3.5 w-3.5" /> Rename folder
              </button>
              <button className="sidebar-item text-danger" role="menuitem" onClick={() => action(() => onDeleteFolder(selectedMenuFolder.id, selectedMenuFolder.name))}>
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
    </DndContext>
  );
}
