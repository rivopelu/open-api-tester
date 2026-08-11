1|import { useCallback, useMemo, useState } from 'react'
2|import type { Endpoint, EndpointParameter, RequestBodyDefinition } from '@modern-api-studio/types'
3|import { AlertCircle, ChevronDown, Copy, Play, RotateCcw, Shield, Send } from 'lucide-react'
4|import { Button, Input, Typography } from './ui'
5|import { cn } from '../lib/utils'
6|
7|/** A single editable key-value row. */
8|interface KvRow {
9|  id: string
10|  key: string
11|  value: string
12|  enabled: boolean
13|}
14|
15|function toKvRows(params: EndpointParameter[], defaults?: Record<string, string>): KvRow[] {
16|  return params.map((p) => ({
17|    id: p.id,
18|    key: p.name,
19|    value: String(p.schema.example ?? defaults?.[p.name] ?? ''),
20|    enabled: p.required,
21|  }))
22|}
23|
24|function buildQuery(rows: KvRow[]): string {
25|  return rows
26|    .filter((r) => r.enabled && r.key)
27|    .map((r) => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
28|    .join('&')
29|}
30|
31|type Tab = 'params' | 'body' | 'auth' | 'headers'
32|type ResponseTab = 'body' | 'headers'
33|
34|const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
35|type HttpMethod = (typeof METHODS)[number]
36|
37|interface EndpointDetailViewProps {
38|  endpoint: Endpoint
39|  className?: string
40|}
41|
42|/** Strip Bruno-style template artifacts (@url:`base`path, stray backticks). */
43|function rawUrl(path: string): string {
44|  return path.replace(/^@url:`([^`]*)`/, '$1').replace(/`/g, '')
45|}
46|
47|function storageKey(endpointId: string): string {
48|  return `api-studio:ep-url:${endpointId}`
49|}
50|
51|/**
52| * Postman / Bruno-style request runner for a single endpoint.  Tabs:
53| *   Params  – path + query key-value editor
54| *   Body    – raw JSON textarea (only when the endpoint has a body)
55| *   Auth    – Bearer token (expandable to Basic later)
56| *   Response – status, time, response body viewer
57| *
58| * The URL bar holds the FULL URL (base + path). It initialises from the
59| * stored endpoint path (which may embed a base like `@url:`http://…/``),
60| * is directly editable, and persists per-endpoint to localStorage — no
61| * environment system needed. Send fetches straight from the browser so it
62| * can hit a localhost dev server (target must send CORS headers).
63| */
64|export default function EndpointDetailView({
65|  endpoint,
66|  className,
67|}: EndpointDetailViewProps) {
68|  const [activeTab, setActiveTab] = useState<Tab>('params')
69|  const [responseTab, setResponseTab] = useState<ResponseTab>('body')
70|
71|  // ── Full editable URL ───────────────────────────────────────────────────
72|  const [urlText, setUrlText] = useState<string>(() => {
73|    try {
74|      const saved = localStorage.getItem(storageKey(endpoint.id))
75|      if (saved) return saved
76|    } catch { /* noop */ }
77|    return rawUrl(endpoint.path)
78|  })
79|
80|  const onUrlChange = useCallback((value: string) => {
81|    const normalized = rawUrl(value).trim().replace(/([^:])\/{2,}/g, '$1/')
82|    setUrlText(normalized)
83|    try { localStorage.setItem(storageKey(endpoint.id), normalized) } catch { /* noop */ }
84|  }, [endpoint.id])
85|
86|  // ── Params state ─────────────────────────────────────────────────────────
87|  const pathParams = useMemo(
88|    () => (endpoint.parameters ?? []).filter((p) => p.in === 'path'),
89|    [endpoint.parameters],
90|  )
91|  const queryParams = useMemo(
92|    () => (endpoint.parameters ?? []).filter((p) => p.in === 'query'),
93|    [endpoint.parameters],
94|  )
95|  const headerParams = useMemo(
96|    () => (endpoint.parameters ?? []).filter((p) => p.in === 'header'),
97|    [endpoint.parameters],
98|  )
99|
100|  const [pathRows, setPathRows] = useState<KvRow[]>(() => toKvRows(pathParams))
101|  const [queryRows, setQueryRows] = useState<KvRow[]>(() => toKvRows(queryParams))
102|  const [headerRows, setHeaderRows] = useState<KvRow[]>(() => toKvRows(headerParams))
103|
104|  // Keep KV rows in sync when endpoint changes
105|  const setRow = (
106|    setter: React.Dispatch<React.SetStateAction<KvRow[]>>,
107|    rows: KvRow[],
108|    idx: number,
109|    patch: Partial<KvRow>,
110|  ) => {
111|    const next = [...rows]
112|    next[idx] = { ...next[idx], ...patch }
113|    setter(next)
114|  }
115|
116|  // ── Body state ───────────────────────────────────────────────────────────
117|  const body: RequestBodyDefinition | undefined = endpoint.requestBody
118|  const [bodyText, setBodyText] = useState<string>(() => {
119|    if (body?.rawJson) return body.rawJson
120|    if (body?.schema?.length) {
121|      return JSON.stringify(
122|        Object.fromEntries(
123|          body.schema.map((p) => [p.name, p.example ?? (p.type === 'string' ? '' : 0)]),
124|        ),
125|        null,
126|        2,
127|      )
128|    }
129|    return ''
130|  })
131|
132|  // ── Auth state ───────────────────────────────────────────────────────────
133|  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic'>('none')
134|  const [bearerToken, setBearerToken] = useState('')
135|  const [basicUser, setBasicUser] = useState('')
136|  const [basicPass, setBasicPass] = useState('')
137|
138|  // ── Response state ───────────────────────────────────────────────────────
139|  const [response, setResponse] = useState<{
140|    status: number
141|    statusText: string
142|    headers: Record<string, string>
143|    data: unknown
144|  } | null>(null)
145|  const [responseRaw, setResponseRaw] = useState<string>('')
146|  const [loading, setLoading] = useState(false)
147|  const [error, setError] = useState<string | null>(null)
148|  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
149|  const [expandedPathParams, setExpandedPathParams] = useState(true)
150|
151|  // ── Build request ────────────────────────────────────────────────────────
152|  const resolvedUrl = useMemo(() => {
153|    let p = rawUrl(urlText).trim().replace(/([^:])\/{2,}/g, '$1/')
154|    for (const row of pathRows) {
155|      if (row.enabled && row.key && row.value) p = p.replace(`{${row.key}}`, row.value)
156|    }
157|    const qs = buildQuery(queryRows)
158|    return qs ? `${p}${p.includes('?') ? '&' : '?'}${qs}` : p
159|  }, [urlText, pathRows, queryRows])
160|
161|  const method: HttpMethod = endpoint.method as HttpMethod
162|  const methodLower = method.toLowerCase() as string
163|
164|  const send = useCallback(async () => {
165|    setLoading(true)
166|    setError(null)
167|    setResponse(null)
168|    setResponseRaw('')
169|    setResponseTab('body')
170|
171|    const outboundHeaders: Record<string, string> = {}
172|    for (const row of headerRows) {
173|      if (row.enabled && row.key) outboundHeaders[row.key] = row.value
174|    }
175|
176|    if (authType === 'bearer' && bearerToken) {
177|      outboundHeaders['Authorization'] = `Bearer ${bearerToken}`
178|    } else if (authType === 'basic' && basicUser) {
179|      outboundHeaders['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`
180|    }
181|
182|    const t0 = performance.now()
183|    try {
184|      // Direct browser fetch — connects straight to the target URL
185|      // (e.g. a localhost dev server). Target must send CORS headers.
186|      const res = await fetch(resolvedUrl, {
187|        method,
188|        headers: outboundHeaders,
189|        body: !['GET', 'HEAD'].includes(method) && bodyText.trim() ? bodyText : undefined,
190|      })
191|      const text = await res.text()
192|      const contentType = res.headers.get('content-type') ?? ''
193|      let data: unknown = text
194|      if (contentType.includes('application/json')) {
195|        try { data = JSON.parse(text) } catch { data = text }
196|      }
197|      setResponse({
198|        status: res.status,
199|        statusText: res.statusText,
200|        headers: Object.fromEntries(res.headers.entries()),
201|        data,
202|      })
203|      setResponseRaw(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
204|    } catch (cause) {
205|      setError(cause instanceof Error ? cause.message : 'Request failed')
206|    } finally {
207|      setElapsedMs(Math.round(performance.now() - t0))
208|      setLoading(false)
209|    }
210|  }, [method, resolvedUrl, headerRows, authType, bearerToken, basicUser, basicPass, bodyText])
211|
212|  const resetResponse = useCallback(() => {
213|    setResponse(null)
214|    setResponseRaw('')
215|    setElapsedMs(null)
216|    setError(null)
217|  }, [])
218|
219|  const responseStatus = response?.status ?? 0
220|  const statusClass =
221|    responseStatus >= 200 && responseStatus < 300
222|      ? 'text-green'
223|      : responseStatus >= 400
224|        ? 'text-danger'
225|        : responseStatus >= 300
226|          ? 'text-warning'
227|          : ''
228|
229|  const tabs: { key: Tab; label: string; count?: number }[] = [
230|    { key: 'params', label: 'Params', count: pathRows.length + queryRows.length },
231|    { key: 'body', label: 'Body' },
232|    { key: 'auth', label: 'Auth', count: authType !== 'none' ? 1 : 0 },
233|    { key: 'headers', label: 'Headers', count: headerRows.length },
234|  ]
235|
236|  return (
237|    <div className={cn('flex flex-col h-full border-l border-border', className)}>
238|      {/* ── URL bar ───────────────────────────────────────────────────────── */}
239|      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
240|        <select
241|          value={method}
242|          onChange={() => {}}
243|          className={cn(
244|            'flex h-8 w-[80px] shrink-0 items-center justify-center rounded-none border border-border bg-surface px-1 text-xs font-semibold font-mono',
245|            `method-badge badge-${methodLower}`,
246|          )}
247|          aria-label="HTTP Method"
248|          disabled
249|        >
250|          {METHODS.map((m) => (
251|            <option key={m} value={m}>{m}</option>
252|          ))}
253|        </select>
254|        <Input
255|          size="sm"
256|          className="flex-1 font-mono text-xs"
257|          placeholder="Full URL e.g. http://localhost:8888/v1/..."
258|          value={urlText}
259|          onChange={(e) => onUrlChange(e.target.value)}
260|        />
261|        <Button
262|          variant="primary"
263|          size="sm"
264|          onClick={send}
265|          disabled={loading}
266|        >
267|          {loading ? (
268|            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
269|          ) : (
270|            <Send className="h-3.5 w-3.5" />
271|          )}
272|          Send
273|        </Button>
274|      </div>
275|
276|      {/* ── Resolved URL preview ─────────────────────────────────────────── */}
277|      <div className="border-b border-border bg-surface px-3 py-1.5">
278|        <code className="text-xs text-text-muted">
279|          {resolvedUrl}
280|        </code>
281|      </div>
282|
283|      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex min-h-[320px] min-w-0 flex-1 flex-col border-b border-border lg:w-[55%] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 border-b border-border">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={cn('relative flex items-center gap-1 px-3 py-2 text-xs font-medium', activeTab === tab.key ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary')}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="bg-overlay px-1.5 py-px text-[10px]">{tab.count}</span>}
                {activeTab === tab.key && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
              </button>
            ))}
          </div>
      {/* ── Tab panels ────────────────────────────────────────────────────── */}
311|            <div className="scroll-y flex-1 p-3">
312|
313|        {/* ── Params tab ────────────────────────────────────────────────── */}
314|        {activeTab === 'params' && (
315|          <div className="flex flex-col gap-4">
316|            {/* Path params */}
317|            {pathRows.length > 0 && (
318|              <section>
319|                <button
320|                  type="button"
321|                  onClick={() => setExpandedPathParams(!expandedPathParams)}
322|                  className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted"
323|                >
324|                  <ChevronDown className={cn('h-3 w-3 transition-transform', !expandedPathParams && '-rotate-90')} />
325|                  Path Parameters
326|                </button>
327|                {expandedPathParams && (
328|                  <div className="flex flex-col border border-border">
329|                    <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
330|                      <span>Key</span>
331|                      <span>Value</span>
332|                      <span className="text-center">Send</span>
333|                    </div>
334|                    {pathRows.map((row, idx) => (
335|                      <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
336|                        <input
337|                          value={row.key}
338|                          onChange={(e) => setRow(setPathRows, pathRows, idx, { key: e.target.value })}
339|                          className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
340|                          aria-label="Param key"
341|                        />
342|                        <input
343|                          value={row.value}
344|                          onChange={(e) => setRow(setPathRows, pathRows, idx, { value: e.target.value })}
345|                          className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
346|                          placeholder={row.enabled ? 'required' : ''}
347|                          aria-label="Param value"
348|                        />
349|                        <div className="flex justify-center">
350|                          <input
351|                            type="checkbox"
352|                            checked={row.enabled}
353|                            onChange={(e) => setRow(setPathRows, pathRows, idx, { enabled: e.target.checked })}
354|                            className="h-3.5 w-3.5"
355|                            aria-label="Include param"
356|                          />
357|                        </div>
358|                      </div>
359|                    ))}
360|                  </div>
361|                )}
362|              </section>
363|            )}
364|
365|            {/* Query params */}
366|            <section>
367|              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
368|                Query Parameters
369|              </p>
370|              <div className="flex flex-col border border-border">
371|                <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
372|                  <span>Key</span>
373|                  <span>Value</span>
374|                  <span className="text-center">Send</span>
375|                </div>
376|                {queryRows.length === 0 && (
377|                  <p className="px-3 py-3 text-xs text-text-muted italic">No query parameters</p>
378|                )}
379|                {queryRows.map((row, idx) => (
380|                  <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
381|                    <input
382|                      value={row.key}
383|                      onChange={(e) => setRow(setQueryRows, queryRows, idx, { key: e.target.value })}
384|                      className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
385|                      aria-label="Query key"
386|                    />
387|                    <input
388|                      value={row.value}
389|                      onChange={(e) => setRow(setQueryRows, queryRows, idx, { value: e.target.value })}
390|                      className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
391|                      aria-label="Query value"
392|                    />
393|                    <div className="flex justify-center">
394|                      <input
395|                        type="checkbox"
396|                        checked={row.enabled}
397|                        onChange={(e) => setRow(setQueryRows, queryRows, idx, { enabled: e.target.checked })}
398|                        className="h-3.5 w-3.5"
399|                        aria-label="Include query param"
400|                      />
401|                    </div>
402|                  </div>
403|                ))}
404|              </div>
405|            </section>
406|
407|            {/* Header params */}
408|            {headerRows.length > 0 && (
409|              <section>
410|                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
411|                  Headers
412|                </p>
413|                <div className="flex flex-col border border-border">
414|                  <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
415|                    <span>Key</span>
416|                    <span>Value</span>
417|                    <span className="text-center">Send</span>
418|                  </div>
419|                  {headerRows.map((row, idx) => (
420|                    <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0">
421|                      <input
422|                        value={row.key}
423|                        onChange={(e) => setRow(setHeaderRows, headerRows, idx, { key: e.target.value })}
424|                        className="bg-transparent px-2 py-1.5 text-xs font-mono text-text-secondary outline-none"
425|                        aria-label="Header key"
426|                      />
427|                      <input
428|                        value={row.value}
429|                        onChange={(e) => setRow(setHeaderRows, headerRows, idx, { value: e.target.value })}
430|                        className="bg-transparent px-2 py-1.5 text-xs text-text-primary outline-none"
431|                        aria-label="Header value"
432|                      />
433|                      <div className="flex justify-center">
434|                        <input
435|                          type="checkbox"
436|                          checked={row.enabled}
437|                          onChange={(e) => setRow(setHeaderRows, headerRows, idx, { enabled: e.target.checked })}
438|                          className="h-3.5 w-3.5"
439|                          aria-label="Include header"
440|                        />
441|                      </div>
442|                    </div>
443|                  ))}
444|                </div>
445|              </section>
446|            )}
447|          </div>
448|        )}
449|
450|        {/* ── Body tab ──────────────────────────────────────────────────── */}
451|        {activeTab === 'body' && (
452|          <div className="flex flex-col gap-3">
453|            {!body ? (
454|              <p className="text-xs text-text-muted italic">
455|                This endpoint does not define a request body.
456|              </p>
457|            ) : (
458|              <>
459|                <div className="flex items-center gap-2">
460|                  <span className="rounded bg-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
461|                    {body.contentType ?? 'application/json'}
462|                  </span>
463|                  {body.required && (
464|                    <span className="rounded bg-danger/20 px-1.5 py-0.5 text-[10px] font-semibold text-danger">required</span>
465|                  )}
466|                </div>
467|                <textarea
468|                  value={bodyText}
469|                  onChange={(e) => setBodyText(e.target.value)}
470|                  spellCheck={false}
471|                  rows={16}
472|                  className="w-full resize-y rounded border border-border bg-surface p-3 font-mono text-xs text-text-primary outline-none focus:border-primary"
473|                  placeholder='{\n  "key": "value"\n}'
474|                />
475|              </>
476|            )}
477|          </div>
478|        )}
479|
480|        {/* ── Auth tab ──────────────────────────────────────────────────── */}
481|        {activeTab === 'auth' && (
482|          <div className="flex flex-col gap-4">
483|            <div className="flex items-center gap-2">
484|              <Shield className="h-4 w-4 text-text-muted" />
485|              <select
486|                value={authType}
487|                onChange={(e) => setAuthType(e.target.value as typeof authType)}
488|                className="h-8 rounded border border-border bg-surface px-2 text-xs text-text-primary outline-none focus:border-primary"
489|              >
490|                <option value="none">No Auth</option>
491|                <option value="bearer">Bearer Token</option>
492|                <option value="basic">Basic Auth</option>
493|              </select>
494|            </div>
495|
496|            {authType === 'none' && (
497|              <p className="text-xs text-text-muted italic">No authentication will be attached to this request.</p>
498|            )}
499|
500|            {authType === 'bearer' && (
501|              <div className="flex flex-col gap-1.5">
502|                <label className="text-xs font-semibold text-text-secondary">Token</label>
503|                <Input
504|                  size="sm"
505|                  className="font-mono text-xs"
506|                  placeholder="eyJhbG...NiIs..."
507|                  value={bearerToken}
508|                  onChange={(e) => setBearerToken(e.target.value)}
509|                />
510|                <Typography variant="caption" tone="muted">
511|                  Added as <code>Authorization: Bearer ***"<token>"}</code>
512|                </Typography>
513|              </div>
514|            )}
515|
516|            {authType === 'basic' && (
517|              <div className="flex flex-col gap-3">
518|                <div className="flex flex-col gap-1.5">
519|                  <label className="text-xs font-semibold text-text-secondary">Username</label>
520|                  <Input size="sm" value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
521|                </div>
522|                <div className="flex flex-col gap-1.5">
523|                  <label className="text-xs font-semibold text-text-secondary">Password</label>
524|                  <Input size="sm" type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} />
525|                </div>
526|              </div>
527|            )}
528|          </div>
529|        )}
530|
531|          {activeTab === 'headers' && (
            <div className="flex flex-col border border-border">
              <div className="grid grid-cols-[1fr_1fr_80px] border-b border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase text-text-muted"><span>Key</span><span>Value</span><span className="text-center">Send</span></div>
              {headerRows.length === 0 && <p className="p-3 text-xs italic text-text-muted">No request headers</p>}
              {headerRows.map((row, idx) => <div key={row.id} className="grid grid-cols-[1fr_1fr_80px] items-center border-b border-border last:border-0"><input value={row.key} onChange={(e) => setRow(setHeaderRows, headerRows, idx, { key: e.target.value })} className="bg-transparent px-2 py-1.5 font-mono text-xs outline-none" /><input value={row.value} onChange={(e) => setRow(setHeaderRows, headerRows, idx, { value: e.target.value })} className="bg-transparent px-2 py-1.5 text-xs outline-none" /><input type="checkbox" checked={row.enabled} onChange={(e) => setRow(setHeaderRows, headerRows, idx, { enabled: e.target.checked })} className="mx-auto" /></div>)}
            </div>
          )}
            </div>
        </section>

        <section className="flex min-h-[320px] min-w-0 flex-1 flex-col bg-overlay/20 lg:w-[45%]">
          <div className="flex h-9 shrink-0 items-center border-b border-border px-3">
            <span className="text-xs font-semibold text-text-secondary">Response</span>
            {response && <><span className={cn('ml-auto font-mono text-xs font-bold', statusClass)}>{responseStatus} {response.statusText}</span><span className="ml-3 text-[11px] text-text-muted">{elapsedMs} ms</span><span className="ml-3 text-[11px] text-text-muted">{new Blob([responseRaw]).size} B</span></>}
          </div>
          <div className="flex shrink-0 border-b border-border">
            {(['body', 'headers'] as ResponseTab[]).map((tab) => <button key={tab} type="button" onClick={() => setResponseTab(tab)} className={cn('relative px-3 py-2 text-xs capitalize', responseTab === tab ? 'text-text-primary' : 'text-text-muted')}>{tab}{responseTab === tab && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}</button>)}
            {response && <div className="ml-auto flex items-center pr-2"><button type="button" onClick={() => navigator.clipboard.writeText(responseRaw).catch(() => {})} className="p-1 text-text-muted hover:text-text-primary" aria-label="Copy response"><Copy className="h-3.5 w-3.5" /></button><button type="button" onClick={resetResponse} className="p-1 text-text-muted hover:text-text-primary" aria-label="Clear response"><RotateCcw className="h-3.5 w-3.5" /></button></div>}
          </div>
          <div className="scroll-y flex-1 p-3">
            {!response && !loading && !error && <div className="flex h-full flex-col items-center justify-center text-center"><Play className="mb-2 h-8 w-8 text-text-muted" /><p className="text-sm text-text-muted">Send a request to see the response.</p></div>}
            {loading && <div className="flex h-full flex-col items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" /><p className="mt-2 text-xs text-text-muted">Sending...</p></div>}
            {error && <div className="border border-danger/40 bg-danger/10 p-3 text-xs text-danger"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />{error}</div>}
            {response && responseTab === 'body' && <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-primary">{responseRaw}</pre>}
            {response && responseTab === 'headers' && <div className="border border-border">{Object.entries(response.headers).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(120px,1fr)_2fr] border-b border-border px-2 py-1.5 text-xs last:border-0"><code className="text-text-secondary">{key}</code><span className="break-all text-text-muted">{value}</span></div>)}</div>}
          </div>
        </section>
      </div>
    </div>
  )
}
