import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Endpoint } from '@modern-api-studio/types';
import type { EndpointDto } from '../lib/api';
import type { EndpointFolderDto } from '../lib/api';
import type { EndpointOrderGroup } from '../repositories';
import {
  AlertTriangle,
  ChevronRight,
  FilePlus2,
  Folder,
  FolderPlus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Lock,
  Pencil,
  Search,
  Trash2,
  FileJson2,
} from 'lucide-react';
import { Input } from './ui';
import { cn } from '../lib/utils';

export interface EndpointListSidebarProps {
  endpoints: Endpoint[];
  endpointDtos: EndpointDto[];
  folders: EndpointFolderDto[];
  activeEndpointId?: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onSelectExamples: (endpointId: string, exampleId?: string) => void;
  onCreateEndpoint: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, currentName: string) => void;
  onRenameEndpoint: (endpointId: string, currentName: string) => void;
  onReorderEndpoints: (groups: EndpointOrderGroup[]) => void;
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
  onSelectExamples: (exampleId?: string) => void;
  onContextMenu: (event: MouseEvent) => void;
  sortingDisabled: boolean;
}

function EndpointRow({ endpoint, folderId, depth, active, onSelect, onSelectExamples, onContextMenu, sortingDisabled }: EndpointRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `endpoint:${endpoint.id}`,
    data: { type: 'endpoint', id: endpoint.id, folderId } satisfies DragItem,
    disabled: sortingDisabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ ...getDragStyle(transform, isDragging), transition }}
      className={cn(isDragging && 'opacity-30')}
    >
    <div
      onContextMenu={onContextMenu}
      className={cn('sidebar-item group cursor-pointer', active && 'active', isDragging && 'opacity-30')}
      style={{ paddingLeft: 10 + depth * 14 }}
      {...attributes}
    >
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex h-5 w-4 shrink-0 items-center justify-center text-text-muted" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${endpoint.summary || endpoint.path}`}>
        <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
      </button>
      <span
        {...listeners}
        className={cn(
          '-ml-1 flex h-5 w-3 shrink-0 touch-none items-center justify-center text-text-muted opacity-0 transition-opacity group-hover:opacity-100',
          sortingDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
        )}
        aria-label={sortingDisabled
          ? 'Clear search to reorder endpoints'
          : `Drag ${endpoint.summary || endpoint.path}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
      <span className={cn('method-badge', `badge-${endpoint.method.toLowerCase()}`)}>{endpoint.method}</span>
      <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold', !endpoint.summary && 'font-mono font-normal')}>
        {endpoint.summary || endpoint.path}
      </span>
      {endpoint.security && endpoint.security.length > 0 && <Lock className="h-3 w-3 shrink-0 text-warning" />}
      {endpoint.deprecated && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
      </button>
    </div>
    {expanded && (() => {
      const examples = [
        ...(endpoint.requestBody?.examples ?? []),
        ...endpoint.responses.flatMap((response) => response.examples ?? []),
      ]
      return (
        <div>
          <button type="button" onClick={() => onSelectExamples()} className="sidebar-item text-[11px] text-text-muted hover:text-primary" style={{ paddingLeft: 48 + depth * 14 }}>
            <FileJson2 className="h-3.5 w-3.5" /> Examples
            <span className="ml-auto font-mono text-[9px]">{examples.length}</span>
          </button>
          {examples.map((example) => (
            <button key={example.id} type="button" onClick={() => onSelectExamples(example.id)} className="sidebar-item font-mono text-[10px] text-text-muted hover:text-primary" style={{ paddingLeft: 66 + depth * 14 }}>
              <FileJson2 className="h-3 w-3" /><span className="truncate">{example.name}</span>
            </button>
          ))}
        </div>
      )
    })()}
    </div>
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
        droppable.isOver && !draggable.isDragging && 'bg-primary/15 text-primary outline-1 outline-inset outline-primary/50',
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

interface EndpointGroupDropZoneProps {
  folderId: string | null;
  empty: boolean;
  visible: boolean;
  children: ReactNode;
}

function EndpointGroupDropZone({ folderId, empty, visible, children }: EndpointGroupDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: folderId === null
      ? 'drop-endpoint-group:root'
      : `drop-endpoint-group:folder:${folderId}`,
    data: { folderId },
    disabled: !visible,
  });

  return (
    <div>
      {children}
      {visible && (
        <div
          ref={setNodeRef}
          className={cn(
            'mx-2 border border-dashed border-transparent transition-colors',
            empty ? 'my-1 min-h-8' : 'h-2',
            isOver && 'border-primary bg-primary/10',
          )}
          aria-label={folderId ? 'Move endpoint to folder' : 'Move endpoint to project root'}
        />
      )}
    </div>
  );
}

export function EndpointListSidebar({
  endpoints,
  endpointDtos,
  folders,
  activeEndpointId,
  onSelectEndpoint,
  onSelectExamples,
  onCreateEndpoint,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameEndpoint,
  onReorderEndpoints,
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const orderedEndpointDtos = useMemo(() => [...endpointDtos].sort((a, b) =>
    a.sortOrder - b.sortOrder
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id)
  ), [endpointDtos]);

  const endpointIdsByFolder = useMemo(() => {
    const map = new Map<string | null, string[]>();
    for (const dto of orderedEndpointDtos) {
      const siblings = map.get(dto.folderId) ?? [];
      siblings.push(dto.id);
      map.set(dto.folderId, siblings);
    }
    return map;
  }, [orderedEndpointDtos]);

  const endpointsByFolder = useMemo(() => {
    const map = new Map<string | null, Endpoint[]>();
    for (const dto of orderedEndpointDtos) {
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
  }, [endpointById, orderedEndpointDtos, query]);

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

  const placeEndpoint = (
    endpointId: string,
    targetFolderId: string | null,
    targetIndex?: number,
  ) => {
    if (query) return;
    const sourceDto = endpointDtos.find((endpoint) => endpoint.id === endpointId);
    if (!sourceDto) return;

    const sourceIds = [...(endpointIdsByFolder.get(sourceDto.folderId) ?? [])];
    const destinationIds = sourceDto.folderId === targetFolderId
      ? sourceIds
      : [...(endpointIdsByFolder.get(targetFolderId) ?? [])];
    const sourceIndex = sourceIds.indexOf(endpointId);
    if (sourceIndex < 0) return;

    if (sourceDto.folderId === targetFolderId) {
      const nextIds = sourceIds.filter((id) => id !== endpointId);
      const nextIndex = Math.max(0, Math.min(targetIndex ?? nextIds.length, nextIds.length));
      nextIds.splice(nextIndex, 0, endpointId);
      if (nextIds.every((id, index) => id === sourceIds[index])) return;
      onReorderEndpoints([{ folderId: targetFolderId, endpointIds: nextIds }]);
      return;
    }

    const nextSourceIds = sourceIds.filter((id) => id !== endpointId);
    const nextDestinationIds = destinationIds.filter((id) => id !== endpointId);
    const nextIndex = Math.max(
      0,
      Math.min(targetIndex ?? nextDestinationIds.length, nextDestinationIds.length),
    );
    nextDestinationIds.splice(nextIndex, 0, endpointId);
    onReorderEndpoints([
      { folderId: sourceDto.folderId, endpointIds: nextSourceIds },
      { folderId: targetFolderId, endpointIds: nextDestinationIds },
    ]);
    if (targetFolderId) {
      setExpandedFolders((current) => new Set(current).add(targetFolderId));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const item = event.active.data.current as DragItem | undefined;
    const overData = event.over?.data.current as Record<string, unknown> | undefined;
    const targetFolderId = overData?.folderId as string | null | undefined;
    setActiveDrag(null);

    if (!item || targetFolderId === undefined) return;
    if (item.type === 'endpoint') {
      if (query) return;
      if (overData?.type === 'endpoint' && typeof overData.id === 'string') {
        const targetIds = endpointIdsByFolder.get(targetFolderId) ?? [];
        const overIndex = targetIds.indexOf(overData.id);
        if (overIndex < 0) return;
        const activeTop = event.active.rect.current.translated?.top;
        const overMiddle = event.over
          ? event.over.rect.top + event.over.rect.height / 2
          : undefined;
        const insertAfter = activeTop !== undefined
          && overMiddle !== undefined
          && activeTop > overMiddle;
        let targetIndex = overIndex + (insertAfter ? 1 : 0);
        if (item.folderId === targetFolderId) {
          const sourceIndex = targetIds.indexOf(item.id);
          if (sourceIndex >= 0 && sourceIndex < targetIndex) targetIndex -= 1;
        }
        placeEndpoint(item.id, targetFolderId, targetIndex);
      } else {
        placeEndpoint(item.id, targetFolderId);
      }
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
      onSelectExamples={(exampleId) => onSelectExamples(endpoint.id, exampleId)}
      onContextMenu={(event) => openMenu(event, { type: 'endpoint', id: endpoint.id })}
      sortingDisabled={Boolean(query)}
    />
  );

  const renderEndpointGroup = (
    groupEndpoints: Endpoint[],
    folderId: string | null,
    depth: number,
  ) => (
    <EndpointGroupDropZone
      folderId={folderId}
      empty={groupEndpoints.length === 0}
      visible={activeDrag?.type === 'endpoint'}
    >
      <SortableContext
        items={groupEndpoints.map((endpoint) => `endpoint:${endpoint.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {groupEndpoints.map((endpoint) => renderEndpoint(endpoint, folderId, depth))}
      </SortableContext>
    </EndpointGroupDropZone>
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
            {renderEndpointGroup(ownEndpoints, folder.id, depth + 1)}
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
  const selectedMenuEndpointDto = menu?.type === 'endpoint'
    ? endpointDtos.find((endpoint) => endpoint.id === menu.id)
    : undefined;
  const selectedMenuEndpointIds = selectedMenuEndpointDto
    ? endpointIdsByFolder.get(selectedMenuEndpointDto.folderId) ?? []
    : [];
  const selectedMenuEndpointIndex = selectedMenuEndpointDto
    ? selectedMenuEndpointIds.indexOf(selectedMenuEndpointDto.id)
    : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveDrag(null)}
      onDragEnd={handleDragEnd}
    >
    <aside className={cn('flex w-70 shrink-0 flex-col border-r border-border bg-surface', className)}>
      <div className="border-b border-border p-2.5">
        <Input size="sm" leadingIcon={<Search className="h-3.5 w-3.5" />} placeholder="Search endpoints..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>
      <div className="scroll-y flex-1 py-2" onContextMenu={(event) => openMenu(event, { type: 'root' })}>
        <RootDropZone visible={activeDrag !== null} />
        {!hasResults && <p className="px-3 py-2 text-xs text-text-muted">No endpoints or folders found</p>}
        {rootFolders.map((folder) => renderFolder(folder, 0))}
        {renderEndpointGroup(rootEndpoints, null, 0)}
      </div>

      {menu && (
        <div ref={menuRef} role="menu" className="fixed z-200 min-w-47.5 border border-border bg-surface p-1.5" style={{ left: menu.x, top: menu.y }}>
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
          {selectedMenuEndpoint && selectedMenuEndpointDto && (
            <>
              <button className="sidebar-item" role="menuitem" onClick={() => action(() => onRenameEndpoint(selectedMenuEndpoint.id, selectedMenuEndpoint.summary || selectedMenuEndpoint.path))}>
                <Pencil className="h-3.5 w-3.5" /> Rename endpoint
              </button>
              <button
                className="sidebar-item disabled:cursor-not-allowed disabled:opacity-40"
                role="menuitem"
                disabled={Boolean(query) || selectedMenuEndpointIndex <= 0}
                onClick={() => action(() => placeEndpoint(
                  selectedMenuEndpoint.id,
                  selectedMenuEndpointDto.folderId,
                  selectedMenuEndpointIndex - 1,
                ))}
              >
                <ArrowUp className="h-3.5 w-3.5" /> Move up
              </button>
              <button
                className="sidebar-item disabled:cursor-not-allowed disabled:opacity-40"
                role="menuitem"
                disabled={Boolean(query) || selectedMenuEndpointIndex < 0 || selectedMenuEndpointIndex >= selectedMenuEndpointIds.length - 1}
                onClick={() => action(() => placeEndpoint(
                  selectedMenuEndpoint.id,
                  selectedMenuEndpointDto.folderId,
                  selectedMenuEndpointIndex + 1,
                ))}
              >
                <ArrowDown className="h-3.5 w-3.5" /> Move down
              </button>
              <button
                className="sidebar-item disabled:cursor-not-allowed disabled:opacity-40"
                role="menuitem"
                disabled={Boolean(query) || selectedMenuEndpointDto.folderId === null}
                onClick={() => action(() => placeEndpoint(selectedMenuEndpoint.id, null))}
              >
                Move to root
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="sidebar-item disabled:cursor-not-allowed disabled:opacity-40"
                  role="menuitem"
                  disabled={Boolean(query) || selectedMenuEndpointDto.folderId === folder.id}
                  onClick={() => action(() => placeEndpoint(selectedMenuEndpoint.id, folder.id))}
                >
                  <Folder className="h-3.5 w-3.5" /> Move to {folder.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </aside>
    <DragOverlay dropAnimation={null}>
      {activeDrag?.type === 'endpoint' ? (
        <div className="flex min-w-55 items-center gap-2 border border-primary/50 bg-card px-3 py-2 text-xs text-text-primary shadow-lg">
          <span className={cn('method-badge', `badge-${endpointById.get(activeDrag.id)?.method.toLowerCase()}`)}>
            {endpointById.get(activeDrag.id)?.method}
          </span>
          <span className="truncate font-semibold">{endpointById.get(activeDrag.id)?.summary || endpointById.get(activeDrag.id)?.path}</span>
        </div>
      ) : activeDrag?.type === 'folder' ? (
        <div className="flex min-w-50 items-center gap-2 border border-primary/50 bg-card px-3 py-2 text-xs text-text-primary shadow-lg">
          <Folder className="h-3.5 w-3.5 text-purple" /> {folderById.get(activeDrag.id)?.name}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
