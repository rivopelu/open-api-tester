import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Endpoint, EndpointParameter, HttpMethod, RequestBodyDefinition } from '@modern-api-studio/types'
import {
  AlertCircle,
  Braces,
  Check,
  Clock3,
  Code2,
  Copy,
  FileJson,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  ChevronDown,
  Pencil,
} from 'lucide-react'
import { Button, Input, Popover, Tooltip } from './ui'
import { cn } from '../lib/utils'
import { interpolateEnvironment, useEnvironmentStore } from '../store/useEnvironmentStore'
import { EndpointContractExamples } from './EndpointContractExamples'

interface KvRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

type RequestTab = 'params' | 'authorization' | 'headers' | 'body' | 'examples'
type ResponseTab = 'body' | 'headers'

interface EndpointDetailViewProps {
  endpoint: Endpoint
  className?: string
  initialTab?: 'params' | 'examples'
  initialExampleId?: string
  onMethodChange?: (method: HttpMethod) => Promise<void>
  onSaveContract?: (contract: Pick<Endpoint, 'requestBody' | 'responses'>) => Promise<void>
}

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE']

const requestTabs: { id: RequestTab; label: string }[] = [
  { id: 'params', label: 'Params' },
  { id: 'authorization', label: 'Authorization' },
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Body' },
  { id: 'examples', label: 'Examples' },
]

function rawUrl(path: string): string {
  return path.replace(/^@url:`([^`]*)`/, '$1').replace(/`/g, '')
}

function storageKey(endpointId: string): string {
  return `api-studio:ep-url:${endpointId}`
}

function rowsFrom(parameters: EndpointParameter[], location: EndpointParameter['in']): KvRow[] {
  return parameters
    .filter((parameter) => parameter.in === location)
    .map((parameter) => ({
      id: parameter.id,
      key: parameter.name,
      value: String(parameter.schema.example ?? ''),
      enabled: parameter.required,
    }))
}

function emptyRow(): KvRow {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true }
}

function initialBody(body?: RequestBodyDefinition): string {
  if (body?.rawJson) return body.rawJson
  if (!body?.schema?.length) return ''
  return JSON.stringify(
    Object.fromEntries(
      body.schema.map((field) => [field.name, field.example ?? (field.type === 'string' ? '' : 0)]),
    ),
    null,
    2,
  )
}

function EnvironmentValue({ value, variables }: { value: string; variables: Record<string, string> }) {
  const parts = value.split(/(\{\{[^{}]+\}\})/g)
  return (
    <span className="min-w-0 flex-1 truncate">
      {parts.map((part, index) => {
        const match = part.match(/^\{\{([^{}]+)\}\}$/)
        if (!match) return part
        const name = match[1].trim()
        const resolved = variables[name]
        const missing = !resolved
        return (
          <Tooltip
            key={`${part}-${index}`}
            content={missing ? `${name}: no value in the active environment` : `${name}: ${resolved}`}
          >
            <span className={cn(
              'mx-0.5 border px-1 py-0.5 font-mono text-[11px]',
              missing
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-primary/40 bg-primary/10 text-primary',
            )}>{part}</span>
          </Tooltip>
        )
      })}
    </span>
  )
}

function parseRequestUrl(value: string): { base: string; pathKeys: string[]; queryRows: KvRow[] } {
  const question = value.indexOf('?')
  const base = question >= 0 ? value.slice(0, question) : value
  const query = question >= 0 ? value.slice(question + 1) : ''
  const pathKeys = Array.from(
    base.matchAll(/(?:^|\/)(?::([A-Za-z_][\w-]*)|\{([A-Za-z_][\w-]*)\})/g),
    (match) => match[1] || match[2],
  )
  return {
    base,
    pathKeys,
    queryRows: Array.from(new URLSearchParams(query).entries()).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
      enabled: true,
    })),
  }
}

function KeyValueEditor({
  rows,
  onChange,
  emptyMessage,
}: {
  rows: KvRow[]
  onChange: (rows: KvRow[]) => void
  emptyMessage: string
}) {
  const update = (index: number, patch: Partial<KvRow>) =>
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))

  return (
    <div className="border border-border bg-base">
      <div className="grid grid-cols-[42px_minmax(140px,1fr)_minmax(180px,1.6fr)_38px] border-b border-border bg-overlay px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
        <span className="py-2 text-center">Use</span>
        <span className="border-l border-border px-3 py-2">Key</span>
        <span className="border-l border-border px-3 py-2">Value</span>
        <span />
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-xs text-text-muted">{emptyMessage}</div>
      )}
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="group grid grid-cols-[42px_minmax(140px,1fr)_minmax(180px,1.6fr)_38px] border-b border-border last:border-b-0"
        >
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(event) => update(index, { enabled: event.target.checked })}
              className="h-3.5 w-3.5 accent-primary"
              aria-label={`Include ${row.key || 'row'}`}
            />
          </label>
          <input
            value={row.key}
            onChange={(event) => update(index, { key: event.target.value })}
            placeholder="Key"
            className="min-w-0 border-l border-border bg-transparent px-3 py-2 font-mono text-xs text-text-secondary outline-none focus:bg-surface"
          />
          <input
            value={row.value}
            onChange={(event) => update(index, { value: event.target.value })}
            placeholder="Value"
            className="min-w-0 border-l border-border bg-transparent px-3 py-2 font-mono text-xs text-text-primary outline-none focus:bg-surface"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
            className="flex items-center justify-center text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus:opacity-100"
            aria-label="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow()])}
        className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
      >
        <Plus className="h-3.5 w-3.5" /> Add row
      </button>
    </div>
  )
}

export default function EndpointDetailView({ endpoint, className, initialTab = 'params', initialExampleId, onMethodChange, onSaveContract }: EndpointDetailViewProps) {
  const environments = useEnvironmentStore((state) => state.environments)
  const activeEnvironmentId = useEnvironmentStore((state) => state.activeEnvironmentId)
  const variables = environments.find((environment) => environment.id === activeEnvironmentId)?.variables ?? {}
  const [activeTab, setActiveTab] = useState<RequestTab>('params')
  const [responseTab, setResponseTab] = useState<ResponseTab>('body')
  const [urlText, setUrlText] = useState('')
  const [editingUrl, setEditingUrl] = useState(false)
  const [pathRows, setPathRows] = useState<KvRow[]>([])
  const [queryRows, setQueryRows] = useState<KvRow[]>([])
  const [headerRows, setHeaderRows] = useState<KvRow[]>([])
  const [bodyText, setBodyText] = useState('')
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic'>('none')
  const [bearerToken, setBearerToken] = useState('')
  const [editingBearerToken, setEditingBearerToken] = useState(false)
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')
  const [response, setResponse] = useState<{
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
  } | null>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [methodSaving, setMethodSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let saved = ''
    try {
      saved = localStorage.getItem(storageKey(endpoint.id)) ?? ''
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
    const parameters = endpoint.parameters ?? []
    const parsed = parseRequestUrl(saved || rawUrl(endpoint.path))
    const definedPathRows = rowsFrom(parameters, 'path')
    setUrlText(parsed.base)
    setPathRows([
      ...definedPathRows,
      ...parsed.pathKeys.filter((key) => !definedPathRows.some((row) => row.key === key)).map((key) => ({ id: crypto.randomUUID(), key, value: '', enabled: true })),
    ])
    setQueryRows(parsed.queryRows.length ? parsed.queryRows : rowsFrom(parameters, 'query'))
    setHeaderRows(rowsFrom(parameters, 'header'))
    setBodyText(initialBody(endpoint.requestBody))
    setActiveTab(initialTab)
    setResponse(null)
    setError(null)
    setElapsedMs(null)
  }, [endpoint, initialTab])

  const onUrlChange = (value: string) => {
    const parsed = parseRequestUrl(value)
    setUrlText(value)
    if (parsed.queryRows.length) setQueryRows(parsed.queryRows)
    setPathRows((current) => parsed.pathKeys.map((key) => {
      const existing = current.find((row) => row.key === key)
      return existing ?? { id: crypto.randomUUID(), key, value: '', enabled: true }
    }))
    try {
      localStorage.setItem(storageKey(endpoint.id), value)
    } catch {
      // Keep the request usable even when persistence is unavailable.
    }
  }

  const onPathRowsChange = (nextRows: KvRow[]) => {
    let nextUrl = urlText
    for (let index = 0; index < pathRows.length; index += 1) {
      const previous = pathRows[index]
      const next = nextRows.find((row) => row.id === previous.id)
      const escaped = previous.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (!next) {
        nextUrl = nextUrl
          .replace(new RegExp(`/:${escaped}(?=/|\\?|$)`), '')
          .replace(new RegExp(`/\\{${escaped}\\}(?=/|\\?|$)`), '')
      } else if (next.key && next.key !== previous.key) {
        nextUrl = nextUrl
          .replace(new RegExp(`:${escaped}(?=/|\\?|$)`, 'g'), `:${next.key}`)
          .replace(new RegExp(`\\{${escaped}\\}`, 'g'), `{${next.key}}`)
      }
    }
    setUrlText(nextUrl)
    setPathRows(nextRows)
    try {
      localStorage.setItem(storageKey(endpoint.id), nextUrl)
    } catch {
      // Keep editing usable when persistence is unavailable.
    }
  }

  const onUrlBlur = () => {
    const parsed = parseRequestUrl(urlText)
    if (urlText.includes('?')) {
      setQueryRows(parsed.queryRows)
      setUrlText(parsed.base)
      try {
        localStorage.setItem(storageKey(endpoint.id), parsed.base)
      } catch {
        // Keep editing usable when persistence is unavailable.
      }
    }
    setEditingUrl(false)
  }

  const resolvedUrl = useMemo(() => {
    const parsed = parseRequestUrl(interpolateEnvironment(rawUrl(urlText).trim(), variables))
    let url = parsed.base.replace(/([^:])\/{2,}/g, '$1/')
    for (const row of pathRows) {
      if (row.enabled && row.key && row.value) {
        const value = interpolateEnvironment(row.value, variables)
        url = url.replaceAll(`{${row.key}}`, encodeURIComponent(value)).replaceAll(`:${row.key}`, encodeURIComponent(value))
      }
    }
    const query = queryRows
      .filter((row) => row.enabled && row.key)
      .map((row) => `${encodeURIComponent(interpolateEnvironment(row.key, variables))}=${encodeURIComponent(interpolateEnvironment(row.value, variables))}`)
      .join('&')
    return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url
  }, [pathRows, queryRows, urlText, variables])

  const clearResponse = useCallback(() => {
    setResponse(null)
    setElapsedMs(null)
    setError(null)
  }, [])

  const send = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    setResponseTab('body')

    const headers = Object.fromEntries(
      headerRows.filter((row) => row.enabled && row.key).map((row) => [interpolateEnvironment(row.key, variables), interpolateEnvironment(row.value, variables)]),
    )
    if (authType === 'bearer' && bearerToken) headers.Authorization = `Bearer ${interpolateEnvironment(bearerToken, variables)}`
    if (authType === 'basic' && basicUser) {
      headers.Authorization = `Basic ${btoa(`${interpolateEnvironment(basicUser, variables)}:${interpolateEnvironment(basicPass, variables)}`)}`
    }

    const startedAt = performance.now()
    try {
      const method = endpoint.method.toUpperCase()
      const result = await fetch(resolvedUrl, {
        method,
        headers,
        body: !['GET', 'HEAD'].includes(method) && bodyText.trim() ? interpolateEnvironment(bodyText, variables) : undefined,
      })
      const text = await result.text()
      let formatted = text
      if (result.headers.get('content-type')?.includes('application/json')) {
        try {
          formatted = JSON.stringify(JSON.parse(text), null, 2)
        } catch {
          formatted = text
        }
      }
      setResponse({
        status: result.status,
        statusText: result.statusText,
        headers: Object.fromEntries(result.headers.entries()),
        body: formatted,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request could not be completed.')
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt))
      setLoading(false)
    }
  }, [authType, basicPass, basicUser, bearerToken, bodyText, endpoint.method, headerRows, resolvedUrl, variables])

  const copyResponse = async () => {
    if (!response) return
    await navigator.clipboard.writeText(response.body)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const method = endpoint.method.toLowerCase()
  const requestCount: Partial<Record<RequestTab, number>> = {
    params: pathRows.length + queryRows.length,
    headers: headerRows.length,
    authorization: authType === 'none' ? 0 : 1,
    body: endpoint.requestBody ? 1 : 0,
    examples: (endpoint.requestBody?.examples?.length ?? 0) + endpoint.responses.reduce((total, response) => total + (response.examples?.length ?? 0), 0),
  }
  const successful = response && response.status >= 200 && response.status < 300

  return (
    <div className={cn('flex h-full min-w-0 flex-col bg-base', className)}>
      <header className="shrink-0 border-b border-border bg-surface px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('method-badge shrink-0', `badge-${method}`)}>{endpoint.method}</span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-sm font-semibold text-text-primary">
              {endpoint.summary || 'Untitled request'}
            </h2>
            <p className="mt-0.5 truncate font-mono text-[11px] text-text-muted">
              {endpoint.operationId || endpoint.path}
            </p>
          </div>
          {endpoint.deprecated && (
            <span className="ml-auto border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-warning">
              Deprecated
            </span>
          )}
        </div>
      </header>

      <div className="shrink-0 border-b border-border bg-overlay px-5 py-4">
        <div className="flex h-10 min-w-0 border border-border bg-base focus-within:border-primary">
          <Popover
            align="start"
            triggerClassName="w-[92px] shrink-0"
            className="mt-1 w-[132px] min-w-0 p-1"
            trigger={({ open }) => (
              <button
                type="button"
                disabled={methodSaving}
                aria-label="HTTP method"
                className={cn(
                  'flex h-full w-full items-center justify-between border-r border-border px-3 font-mono text-xs font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-60',
                  `badge-${method}`,
                  open && 'ring-2 ring-inset ring-primary',
                )}
              >
                {endpoint.method}<ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              </button>
            )}
          >
            {({ close }) => httpMethods.map((httpMethod) => (
              <button
                key={httpMethod}
                type="button"
                role="menuitemradio"
                aria-checked={endpoint.method === httpMethod}
                onClick={async () => {
                  close()
                  if (!onMethodChange || httpMethod === endpoint.method) return
                  setMethodSaving(true)
                  try {
                    await onMethodChange(httpMethod)
                  } finally {
                    setMethodSaving(false)
                  }
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 font-mono text-xs font-bold transition-colors hover:bg-overlay focus-visible:bg-overlay focus-visible:outline-none',
                  endpoint.method === httpMethod ? `badge-${httpMethod.toLowerCase()}` : 'text-text-secondary',
                )}
              >
                {httpMethod}
              </button>
            ))}
          </Popover>
          {editingUrl ? (
            <input
              autoFocus
              value={urlText}
              onChange={(event) => onUrlChange(event.target.value)}
              onBlur={onUrlBlur}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !loading) {
                  onUrlBlur()
                  void send()
                }
              }}
              placeholder="Enter a complete request URL"
              className="min-w-0 flex-1 bg-transparent px-4 font-mono text-xs text-text-primary outline-none placeholder:text-text-muted"
              aria-label="Request URL"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingUrl(true)}
              className="flex min-w-0 flex-1 items-center px-4 text-left font-mono text-xs text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              aria-label="Edit request URL"
            >
              {urlText ? (
                <EnvironmentValue value={urlText} variables={variables} />
              ) : (
                <span className="truncate text-text-muted">Enter a complete request URL</span>
              )}
            </button>
          )}
          <Button
            variant="primary"
            size="sm"
            className="h-full min-w-[104px] border-0"
            onClick={() => void send()}
            disabled={loading || !resolvedUrl}
          >
            {loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-base/40 border-t-base" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {loading ? 'Sending' : 'Send'}
          </Button>
        </div>
        {resolvedUrl !== urlText && (
          <p className="mt-2 truncate font-mono text-[10px] text-text-muted">Resolved: {resolvedUrl}</p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="flex min-h-[280px] flex-[1.05] flex-col border-b border-border">
          <nav className="flex h-10 shrink-0 items-end border-b border-border bg-surface px-4" aria-label="Request options">
            {requestTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative flex h-full items-center gap-2 px-3 text-xs font-semibold transition-colors',
                  activeTab === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
                )}
              >
                {tab.label}
                {Boolean(requestCount[tab.id]) && (
                  <span className="min-w-4 bg-overlay px-1 py-0.5 font-mono text-[9px] text-text-secondary">
                    {requestCount[tab.id]}
                  </span>
                )}
                {activeTab === tab.id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </nav>

          <div className="scroll-y flex-1 p-5">
            {activeTab === 'params' && (
              <div className="space-y-5">
                {pathRows.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-text-secondary">Path variables</h3>
                      <span className="font-mono text-[10px] text-text-muted">{pathRows.length} defined</span>
                    </div>
                    <KeyValueEditor rows={pathRows} onChange={onPathRowsChange} emptyMessage="No path variables" />
                  </section>
                )}
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-secondary">Query parameters</h3>
                    <span className="font-mono text-[10px] text-text-muted">{queryRows.length} defined</span>
                  </div>
                  <KeyValueEditor rows={queryRows} onChange={setQueryRows} emptyMessage="This request has no query parameters." />
                </section>
              </div>
            )}

            {activeTab === 'authorization' && (
              <div className="grid max-w-3xl gap-6 md:grid-cols-[220px_1fr]">
                <div>
                  <label className="mb-2 block text-xs font-bold text-text-secondary">Auth type</label>
                  <Popover
                    align="start"
                    triggerClassName="w-full"
                    className="mt-1 w-full min-w-0 p-1"
                    trigger={({ open }) => (
                      <button
                        type="button"
                        className={cn(
                          'flex h-9 w-full items-center justify-between border bg-surface px-3 text-xs font-semibold text-text-primary outline-none transition-colors',
                          open ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-text-muted',
                        )}
                      >
                        {authType === 'none' ? 'No Auth' : authType === 'bearer' ? 'Bearer Token' : 'Basic Auth'}
                        <ChevronDown className={cn('h-3.5 w-3.5 text-text-muted transition-transform', open && 'rotate-180')} />
                      </button>
                    )}
                  >
                    {({ close }) => ([
                      ['none', 'No Auth'],
                      ['bearer', 'Bearer Token'],
                      ['basic', 'Basic Auth'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={authType === value}
                        onClick={() => { setAuthType(value); close() }}
                        className={cn(
                          'flex w-full items-center px-3 py-2 text-xs font-semibold transition-colors hover:bg-overlay focus-visible:bg-overlay focus-visible:outline-none',
                          authType === value ? 'bg-primary/10 text-primary' : 'text-text-secondary',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </Popover>
                </div>
                <div className="border-l border-border pl-6">
                  <div className="mb-4 flex items-center gap-2 text-xs font-bold text-text-secondary">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Authentication details
                  </div>
                  {authType === 'none' && <p className="text-xs text-text-muted">This request does not send authentication credentials.</p>}
                  {authType === 'bearer' && (
                    <div>
                      <label className="mb-2 block text-xs text-text-secondary">Token</label>
                      <div className="flex h-9 border border-border bg-base focus-within:border-primary">
                        {editingBearerToken ? (
                          <input
                            autoFocus
                            value={bearerToken}
                            onChange={(event) => setBearerToken(event.target.value)}
                            onBlur={() => setEditingBearerToken(false)}
                            onKeyDown={(event) => event.key === 'Enter' && setEditingBearerToken(false)}
                            placeholder="Paste token or use {{variable}}"
                            className="min-w-0 flex-1 bg-transparent px-3 font-mono text-xs text-text-primary outline-none placeholder:text-text-muted"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingBearerToken(true)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-3 text-left font-mono text-xs text-text-primary"
                          >
                            {bearerToken ? (
                              <EnvironmentValue value={bearerToken} variables={variables} />
                            ) : (
                              <span className="min-w-0 flex-1 truncate font-sans text-text-muted">Paste token or use {'{{variable}}'}</span>
                            )}
                            <Pencil className="h-3 w-3 shrink-0 text-text-muted" />
                          </button>
                        )}
                        <Popover
                          align="end"
                          triggerClassName="h-full"
                          className="mt-1 w-56 p-1"
                          trigger={(
                            <button type="button" className="flex h-full items-center gap-1.5 border-l border-border px-3 font-mono text-[10px] font-bold text-primary hover:bg-primary/10">
                              <Braces className="h-3.5 w-3.5" /> ENV
                            </button>
                          )}
                        >
                          {({ close }) => Object.keys(variables).length ? (
                            <div>
                              <p className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Environment variables</p>
                              {Object.keys(variables).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => { setBearerToken(`{{${key}}}`); setEditingBearerToken(true); close() }}
                                  className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left font-mono text-xs text-text-secondary hover:bg-overlay hover:text-text-primary"
                                >
                                  <span className="truncate">{`{{${key}}}`}</span>
                                  <span className="max-w-20 truncate text-[10px] text-text-muted">{variables[key]}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="px-3 py-4 text-xs leading-5 text-text-muted">No variables in the active environment.</p>
                          )}
                        </Popover>
                      </div>
                      <p className="mt-2 text-[11px] text-text-muted">Sent as Bearer token. Environment variables use {'{{variable}}'}.</p>
                    </div>
                  )}
                  {authType === 'basic' && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input size="sm" value={basicUser} onChange={(event) => setBasicUser(event.target.value)} placeholder="Username" />
                      <Input type="password" size="sm" value={basicPass} onChange={(event) => setBasicPass(event.target.value)} placeholder="Password" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'headers' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-secondary">Request headers</h3>
                  <span className="font-mono text-[10px] text-text-muted">{headerRows.length} defined</span>
                </div>
                <KeyValueEditor rows={headerRows} onChange={setHeaderRows} emptyMessage="This request has no custom headers." />
              </div>
            )}

            {activeTab === 'body' && (
              <div className="flex h-full min-h-[190px] flex-col border border-border bg-base">
                <div className="flex h-9 shrink-0 items-center border-b border-border bg-overlay px-3">
                  <Braces className="mr-2 h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-[11px] text-text-secondary">
                    {endpoint.requestBody?.contentType || 'application/json'}
                  </span>
                  {!endpoint.requestBody && <span className="ml-auto text-[10px] text-text-muted">No body defined in the specification</span>}
                </div>
                <textarea
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  spellCheck={false}
                  placeholder={'{\n  "key": "value"\n}'}
                  className="min-h-[180px] flex-1 resize-none bg-transparent p-4 font-mono text-xs leading-6 text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            )}

            {activeTab === 'examples' && (
              <EndpointContractExamples
                endpoint={endpoint}
                initialExampleId={initialExampleId}
                onSave={onSaveContract ?? (async () => {})}
              />
            )}
          </div>
        </section>

        <section className="flex min-h-[250px] flex-1 flex-col bg-overlay/30">
          <div className="flex h-10 shrink-0 items-center border-b border-border bg-surface px-5">
            <div className="flex h-full items-center gap-2">
              <Code2 className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-xs font-bold text-text-secondary">Response</span>
            </div>
            {response && (
              <div className="ml-auto flex items-center gap-4 font-mono text-[10px]">
                <span className={cn('flex items-center gap-1.5 font-bold', successful ? 'text-success' : 'text-danger')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', successful ? 'bg-success' : 'bg-danger')} />
                  {response.status} {response.statusText}
                </span>
                <span className="flex items-center gap-1.5 text-text-muted"><Clock3 className="h-3 w-3" />{elapsedMs} ms</span>
                <span className="text-text-muted">{new Blob([response.body]).size} B</span>
              </div>
            )}
          </div>

          <div className="flex h-9 shrink-0 items-center border-b border-border px-4">
            {(['body', 'headers'] as ResponseTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setResponseTab(tab)}
                className={cn('relative h-full px-3 text-xs font-semibold capitalize', responseTab === tab ? 'text-text-primary' : 'text-text-muted')}
              >
                {tab}
                {responseTab === tab && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" />}
              </button>
            ))}
            {response && (
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => void copyResponse()} className="p-1.5 text-text-muted hover:text-text-primary" aria-label="Copy response">
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button type="button" onClick={clearResponse} className="p-1.5 text-text-muted hover:text-text-primary" aria-label="Clear response">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="scroll-y flex-1 p-5">
            {!response && !loading && !error && (
              <div className="flex h-full min-h-[130px] items-center justify-center">
                <div className="text-center">
                  <FileJson className="mx-auto mb-3 h-7 w-7 text-text-muted" />
                  <p className="text-xs font-semibold text-text-secondary">No response yet</p>
                  <p className="mt-1 text-[11px] text-text-muted">Send this request to inspect its status, headers, and body.</p>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex h-full min-h-[130px] items-center justify-center gap-3 text-xs text-text-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" /> Waiting for response…
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 border border-danger/40 bg-danger/10 p-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <div><p className="text-xs font-bold text-danger">Request failed</p><p className="mt-1 text-xs text-text-secondary">{error}</p><p className="mt-2 text-[11px] text-text-muted">Check the URL, target server, and its browser CORS policy.</p></div>
              </div>
            )}
            {response && responseTab === 'body' && (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-6 text-text-primary">{response.body || 'Empty response body'}</pre>
            )}
            {response && responseTab === 'headers' && (
              <div className="border border-border bg-base">
                {Object.entries(response.headers).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(160px,0.7fr)_1.5fr] border-b border-border text-xs last:border-b-0">
                    <code className="border-r border-border px-3 py-2 text-primary">{key}</code>
                    <span className="break-all px-3 py-2 text-text-secondary">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
