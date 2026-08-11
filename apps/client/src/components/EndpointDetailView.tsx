import { useCallback, useMemo, useState } from 'react'
import type { Endpoint, EndpointParameter, RequestBodyDefinition } from '@modern-api-studio/types'
import { AlertCircle, ChevronDown, Copy, Play, RotateCcw, Shield, Send } from 'lucide-react'
import { Button, Input, Typography } from './ui'
import { cn } from '../lib/utils'

/** A single editable key-value row. */
interface KvRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

function toKvRows(params: EndpointParameter[], defaults?: Record<string, string>): KvRow[] {
  return params.map((p) => ({
    id: p.id,
    key: p.name,
    value: String(p.schema.example ?? defaults?.[p.name] ?? ''),
    enabled: p.required,
  }))
}

function buildQuery(rows: KvRow[]): string {
  return rows
    .filter((r) => r.enabled && r.key)
    .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
    .join('&')
}

type Tab = 'params' | 'body' | 'auth' | 'response'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
type HttpMethod = (typeof METHODS)[number]

interface EndpointDetailViewProps {
  endpoint: Endpoint
  className?: string
}

/** Strip Bruno-style template artifacts (@url:`base`path, stray backticks). */
function rawUrl(path: string): string {
  return path.replace(/^@url:`([^`]*)`/, '$1').replace(/`/g, '')
}

function storageKey(endpointId: string): string {
  return `api-studio:ep-url:${endpointId}`
}

/**
 * Postman / Bruno-style request runner for a single endpoint.  Tabs:
 *   Params  – path + query key-value editor
 *   Body    – raw JSON textarea (only when the endpoint has a body)
 *   Auth    – Bearer token (expandable to Basic later)
 *   Response – status, time, response body viewer
 *
 * The URL bar holds the FULL URL (base + path). It initialises from the
 * stored endpoint path (which may embed a base like `@url:`http://…/``),
 * is directly editable, and persists per-endpoint to localStorage — no
 * environment system needed. Send fetches straight from the browser so it
 * can hit a localhost dev server (target must send CORS headers).
 */
export default function EndpointDetailView({
  endpoint,
  className,
}: EndpointDetailViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('params')

  // ── Full editable URL ───────────────────────────────────────────────────
  const [urlText, setUrlText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey(endpoint.id))
      if (saved) return saved
    } catch { /* noop */ }
    return rawUrl(endpoint.path)
  })

  const onUrlChange = useCallback((value: string) => {
    const normalized = rawUrl(value).trim().replace(/([^:])\/{2,}/g, '$1/')
    setUrlText(normalized)
    try { localStorage.setItem(storageKey(endpoint.id), normalized) } catch { /* noop */ }
  }, [endpoint.id])

  // ── Params state ─────────────────────────────────────────────────────────
  const pathParams = useMemo(
    () => endpoint.parameters.filter((p) => p.in === 'path'),
    [endpoint.parameters],
  )
  const queryParams = useMemo(
    () => endpoint.parameters.filter((p) => p.in === 'query'),
    [endpoint.parameters],
  )
  const headerParams = useMemo(
    () => endpoint.parameters.filter((p) => p.in === 'header'),
    [endpoint.parameters],
  )

  const [pathRows, setPathRows] = useState<KvRow[]>(() => toKvRows(pathParams))
  const [queryRows, setQueryRows] = useState<KvRow[]>(() => toKvRows(queryParams))
  const [headerRows, setHeaderRows] = useState<KvRow[]>(() => toKvRows(headerParams))

  // Keep KV rows in sync when endpoint changes
  const setRow = (
    setter: React.Dispatch<React.SetStateAction<KvRow[]>>,
    rows: KvRow[],
    idx: number,
    patch: Partial<KvRow>,
  ) => {
    const next = [...rows]
    next[idx] = { ...next[idx], ...patch }
    setter(next)
  }

  // ── Body state ───────────────────────────────────────────────────────────
  const body: RequestBodyDefinition | undefined = endpoint.requestBody
  const [bodyText, setBodyText] = useState<string>(() => {
    if (body?.rawJson) return body.rawJson
    if (body?.schema?.length) {
      return JSON.stringify(
        Object.fromEntries(
          body.schema.map((p) => [p.name, p.example ?? (p.type === 'string' ? '' : 0)]),
        ),
        null,
        2,
      )
    }
    return ''
  })

  // ── Auth state ───────────────────────────────────────────────────────────
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic'>('none')
  const [bearerToken, setBearerToken] = useState('')
  const [basicUser, setBasicUser] = useState('')
  const [basicPass, setBasicPass] = useState('')

  // ── Response state ───────────────────────────────────────────────────────
  const [response, setResponse] = useState<{
    status: number
    statusText: string
    headers: Record<string, string>
    data: unknown
  } | null>(null)
  const [responseRaw, setResponseRaw] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [expandedPathParams, setExpandedPathParams] = useState(true)

  // ── Build request ────────────────────────────────────────────────────────
  const resolvedUrl = useMemo(() => {
    let p = rawUrl(urlText).trim().replace(/([^:])\/{2,}/g, '$1/')
    for (const row of pathRows) {
      if (row.enabled && row.key && row.value) p = p.replace(`{${row.key}}`, row.value)
    }
    const qs = buildQuery(queryRows)
    return qs ? `${p}${p.includes('?') ? '&' : '?'}${qs}` : p
  }, [urlText, pathRows, queryRows])

  const method: HttpMethod = endpoint.method as HttpMethod
  const methodLower = method.toLowerCase() as string

  const send = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    setResponseRaw('')
    setActiveTab('response')

    const outboundHeaders: Record<string, string> = {}
    for (const row of headerRows) {
      if (row.enabled && row.key) outboundHeaders[row.key] = row.value
    }

    if (authType === 'bearer' && bearerToken) {
      outboundHeaders['Authorization'] = `Bearer ${bearerToken}`
    } else if (authType === 'basic' && basicUser) {
      outboundHeaders['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`
    }

    const t0 = performance.now()
    try {
      // Direct browser fetch — connects straight to the target URL
      // (e.g. a localhost dev server). Target must send CORS headers.
      const res = await fetch(resolvedUrl, {
        method,
        headers: outboundHeaders,
        body: !['GET', 'HEAD'].includes(method) && bodyText.trim() ? bodyText : undefined,
      })
      const text = await res.text()
      const contentType = res.headers.get('content-type') ?? ''
      let data: unknown = text
      if (contentType.includes('application/json')) {
        try { data = JSON.parse(text) } catch { data = text }
      }
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data,
      })
      setResponseRaw(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed')
    } finally {
      setElapsedMs(Math.round(performance.now() - t0))
      setLoading(false)
    }
  }, [method, resolvedUrl, headerRows, authType, bearerToken, basicUser, basicPass, bodyText])

  const resetResponse = useCallback(() => {
    setResponse(null)
    setResponseRaw('')
    setElapsedMs(null)
    setError(null)
  }, [])

  const responseStatus = response?.status ?? 0
  const statusClass =
    responseStatus >= 200 && responseStatus < 300
      ? 'text-green'
      : responseStatus >= 400
        ? 'text-danger'
        : responseStatus >= 300
          ? 'text-warning'
          : ''

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'params', label: 'Params', count: pathRows.length + queryRows.length },
    { key: 'body', label: 'Body' },
    { key: 'auth', label: 'Auth', count: authType !== 'none' ? 1 : 0 },
    { key: 'response', label: 'Response' },
  ]

  return (
    <div className={cn('flex flex-col h-full border-l border-border', className)}>
      {/* ── URL bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <select
          value={method}
          onChange={() => {}}
          className={cn(
            'flex h-8 w-[80px] shrink-0 items-center justify-center rounded-none border border-border bg-surface px-1 text-xs font-semibold font-mono',
            `method-badge badge-${methodLower}`,
          )}
          aria-label="HTTP Method"
          disabled
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <Input
          size="sm"
          className="flex-1 font-mono text-xs"
          placeholder="Full URL e.g. http://localhost:8888/v1/..."
          value={urlText}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={send}
          disabled={loading}
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send
        </Button>
      </div>

      {/* ── Resolved URL preview ─────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface px-3 py-1.5">
        <code className="text-xs text-text-muted">
          {resolvedUrl}
        </code>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="rounded-full bg-overlay px-1.5 py-[1px] text-[10px]">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 inset-x-0 h-[2px] bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab panels ────────────────────────────────────────────────────── */}
      <div className="scroll-y flex-1 p-3">

        {/* ── Params tab ────────────────────────────────────────────────── */}
        {activeTab === 'params' && (
          <div className="flex flex-col gap-4">
            {/* Path params */}
            {pathRows.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setExpandedPathParams(!expandedPathParams)}
                  className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  <ChevronDown className={cn('h-3 w-3 transition-transform', !expandedPathParams && '-rotate-90')} />
                  Path Parameters
                </button>
                {expandedPathParams && (
                  <div className="flex flex-col border border-border">
                    <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      <span>Key</span>
                      <span>Value</span>
                      <span className="text-center">Send</span>
                    </div>
                    {pathRows.map((row, idx) => (
                      <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
                        <input
                          value={row.key}
                          onChange={(e) => setRow(setPathRows, pathRows, idx, { key: e.target.value })}
                          className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
                          aria-label="Param key"
                        />
                        <input
                          value={row.value}
                          onChange={(e) => setRow(setPathRows, pathRows, idx, { value: e.target.value })}
                          className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
                          placeholder={row.enabled ? 'required' : ''}
                          aria-label="Param value"
                        />
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={row.enabled}
                            onChange={(e) => setRow(setPathRows, pathRows, idx, { enabled: e.target.checked })}
                            className="h-3.5 w-3.5"
                            aria-label="Include param"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Query params */}
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Query Parameters
              </p>
              <div className="flex flex-col border border-border">
                <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  <span>Key</span>
                  <span>Value</span>
                  <span className="text-center">Send</span>
                </div>
                {queryRows.length === 0 && (
                  <p className="px-3 py-3 text-xs text-text-muted italic">No query parameters</p>
                )}
                {queryRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
                    <input
                      value={row.key}
                      onChange={(e) => setRow(setQueryRows, queryRows, idx, { key: e.target.value })}
                      className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
                      aria-label="Query key"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => setRow(setQueryRows, queryRows, idx, { value: e.target.value })}
                      className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
                      aria-label="Query value"
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => setRow(setQueryRows, queryRows, idx, { enabled: e.target.checked })}
                        className="h-3.5 w-3.5"
                        aria-label="Include query param"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Header params */}
            {headerRows.length > 0 && (
              <section>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Headers
                </p>
                <div className="flex flex-col border border-border">
                  <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    <span>Key</span>
                    <span>Value</span>
                    <span className="text-center">Send</span>
                  </div>
                  {headerRows.map((row, idx) => (
                    <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
                      <input
                        value={row.key}
                        onChange={(e) => setRow(setHeaderRows, headerRows, idx, { key: e.target.value })}
                        className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
                        aria-label="Header key"
                      />
                      <input
                        value={row.value}
                        onChange={(e) => setRow(setHeaderRows, headerRows, idx, { value: e.target.value })}
                        className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
                        aria-label="Header value"
                      />
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => setRow(setHeaderRows, headerRows, idx, { enabled: e.target.checked })}
                          className="h-3.5 w-3.5"
                          aria-label="Include header"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── Body tab ──────────────────────────────────────────────────── */}
        {activeTab === 'body' && (
          <div className="flex flex-col gap-3">
            {!body ? (
              <p className="text-xs text-text-muted italic">
                This endpoint does not define a request body.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                    {body.contentType ?? 'application/json'}
                  </span>
                  {body.required && (
                    <span className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-danger">required</span>
                  )}
                </div>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  spellCheck={false}
                  rows={16}
                  className="w-full resize-y rounded border border-border bg-surface p-3 font-mono text-xs text-text-primary outline-none focus:border-primary"
                  placeholder='{\n  "key": "value"\n}'
                />
              </>
            )}
          </div>
        )}

        {/* ── Auth tab ──────────────────────────────────────────────────── */}
        {activeTab === 'auth' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-text-muted" />
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as typeof authType)}
                className="h-8 rounded border border-border bg-surface px-2 text-xs text-text-primary outline-none focus:border-primary"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>

            {authType === 'none' && (
              <p className="text-xs text-text-muted italic">No authentication will be attached to this request.</p>
            )}

            {authType === 'bearer' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Token</label>
                <Input
                  size="sm"
                  className="font-mono text-xs"
                  placeholder="eyJhbGciOiJIUzI1NiIs..."
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                />
                <Typography variant="caption" tone="muted">
                  Added as <code>Authorization: Bearer {"<token>"}</code>
                </Typography>
              </div>
            )}

            {authType === 'basic' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Username</label>
                  <Input size="sm" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Password</label>
                  <Input size="sm" type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Response tab ──────────────────────────────────────────────── */}
        {activeTab === 'response' && (
          <div className="flex flex-col gap-3">
            {!response && !loading && !error && (
              <div className="flex flex-col items-center py-10 text-center">
                <Play className="mb-2 h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">Send a request to see the response.</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
                <p className="mt-2 text-xs text-text-muted">Sending...</p>
              </div>
            )}

            {error && (
              <div className="rounded border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="mb-1 inline h-3.5 w-3.5" /> {error}
              </div>
            )}

            {response && (
              <>
                <div className="flex items-center gap-3">
                  <span className={cn('rounded px-2 py-0.5 text-xs font-mono font-bold', statusClass)}>
                    {responseStatus} {response.statusText}
                  </span>
                  {elapsedMs !== null && (
                    <span className="text-[11px] text-text-muted">{elapsedMs} ms</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(responseRaw).catch(() => {})
                    }}
                    className="ml-auto rounded p-1 text-text-muted hover:bg-overlay hover:text-text-secondary"
                    aria-label="Copy response"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={resetResponse}
                    className="rounded p-1 text-text-muted hover:bg-overlay hover:text-text-secondary"
                    aria-label="Clear response"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  readOnly
                  value={responseRaw}
                  rows={20}
                  className="w-full resize-y rounded border border-border bg-surface p-3 font-mono text-xs text-text-primary outline-none"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}