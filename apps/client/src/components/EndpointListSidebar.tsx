import { useMemo, useState } from 'react'
import type { Endpoint } from '@modern-api-studio/types'
import { AlertTriangle, ChevronRight, Lock, Search } from 'lucide-react'
import { Input } from './ui'
import { cn } from '../lib/utils'

export interface EndpointListSidebarProps {
  tags: { id: string; name: string; description?: string }[]
  endpoints: Endpoint[]
  activeEndpointId?: string | null
  onSelectEndpoint: (endpointId: string) => void
  className?: string
}

/**
 * Flat endpoint navigator grouped by tag. Mirrors the editor Sidebar list
 * (search + tag groups + method badges) but read-only: it only reports the
 * selected endpoint via `onSelectEndpoint`.
 */
export function EndpointListSidebar({
  tags,
  endpoints,
  activeEndpointId,
  onSelectEndpoint,
  className,
}: EndpointListSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTags, setExpandedTags] = useState<Set<string>>(
    () => new Set(tags.map((t) => t.name)),
  )

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return endpoints
    return endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary?.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.operationId?.toLowerCase().includes(q) ||
        ep.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [endpoints, searchQuery])

  const groups = useMemo(() => {
    const map: Record<string, Endpoint[]> = { Untagged: [] }
    for (const tag of tags) map[tag.name] = []
    for (const ep of filtered) {
      if (ep.tags.length === 0) map['Untagged'].push(ep)
      else ep.tags.forEach((t) => { if (map[t]) map[t].push(ep); else map['Untagged'].push(ep) })
    }
    return Object.entries(map).filter(([, eps]) => eps.length > 0)
  }, [tags, filtered])

  // While searching every tag group is force-expanded so matches are
  // visible even if the user collapsed the group before typing.
  const isSearching = searchQuery.trim().length > 0

  const toggleTag = (name: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <aside className={cn('flex w-[260px] shrink-0 flex-col border-r border-border bg-surface', className)}>
      {/* Search */}
      <div className="border-b border-border p-2.5">
        <Input
          size="sm"
          leadingIcon={<Search className="h-3.5 w-3.5" />}
          placeholder="Search endpoints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search endpoints"
        />
      </div>

      {/* Grouped endpoint list */}
      <div className="scroll-y flex-1 py-2">
        {groups.length === 0 && (
          <p className="px-3 py-2 text-xs text-text-muted">No endpoints found</p>
        )}
        {groups.map(([tag, eps]) => (
          <div key={tag} className="mb-1">
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

            {(expandedTags.has(tag) || isSearching) && (
              <ul className="flex flex-col">
                {eps.map((ep) => (
                  <li key={ep.id}>
                    <button
                      type="button"
                      onClick={() => onSelectEndpoint(ep.id)}
                      className={cn('sidebar-item pl-5', activeEndpointId === ep.id && 'active')}
                    >
                      <span className={cn('method-badge', `badge-${ep.method.toLowerCase()}`)}>
                        {ep.method}
                      </span>
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
    </aside>
  )
}