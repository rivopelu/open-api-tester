import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Endpoint, EndpointExample, ResponseDefinition } from '@modern-api-studio/types'
import { AlertCircle, Check, FileJson2, Plus, Save, Trash2 } from 'lucide-react'
import { Button, CodeEditor } from './ui'
import { cn } from '../lib/utils'

interface Props {
  endpoint: Endpoint
  initialExampleId?: string
  onSave: (contract: Pick<Endpoint, 'requestBody' | 'responses'>) => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
}

type SelectedExample = { scope: 'request'; id: string } | { scope: 'response'; responseId: string; id: string }

const newExample = (examples: EndpointExample[]): EndpointExample => ({
  id: crypto.randomUUID(),
  name: `example_${Math.max(0, ...examples.map((example) => Number(example.name.match(/^example_(\d+)$/)?.[1]) || 0)) + 1}`,
  summary: '',
  value: '{\n  \n}',
})

export function EndpointContractExamples({ endpoint, initialExampleId, onSave, onDirtyChange }: Props) {
  const [requestExamples, setRequestExamples] = useState<EndpointExample[]>([])
  const [responses, setResponses] = useState<ResponseDefinition[]>([])
  const [selected, setSelected] = useState<SelectedExample | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const dirty = useMemo(() => (
    JSON.stringify(requestExamples) !== JSON.stringify(endpoint.requestBody?.examples ?? [])
    || JSON.stringify(responses) !== JSON.stringify(endpoint.responses)
  ), [endpoint.requestBody?.examples, endpoint.responses, requestExamples, responses])

  useEffect(() => {
    onDirtyChange?.(dirty)
    return () => onDirtyChange?.(false)
  }, [dirty, onDirtyChange])

  useEffect(() => {
    const request = endpoint.requestBody?.examples ?? []
    setRequestExamples(request)
    setResponses(endpoint.responses)
    const requestedRequest = request.find((example) => example.id === initialExampleId)
    const requestedResponse = endpoint.responses.find((response) => response.examples?.some((example) => example.id === initialExampleId))
    setSelected((current) => {
      if (requestedRequest) return { scope: 'request', id: requestedRequest.id }
      if (requestedResponse) {
        return { scope: 'response', responseId: requestedResponse.id, id: initialExampleId! }
      }
      const currentRequest = current?.scope === 'request' && request.some((example) => example.id === current.id)
      const currentResponse = current?.scope === 'response' && endpoint.responses.some(
        (response) => response.id === current.responseId && response.examples?.some((example) => example.id === current.id),
      )
      if (currentRequest || currentResponse) return current
      return request[0]
        ? { scope: 'request', id: request[0].id }
        : endpoint.responses[0]?.examples?.[0]
          ? { scope: 'response', responseId: endpoint.responses[0].id, id: endpoint.responses[0].examples![0].id }
          : null
    })
  }, [endpoint, initialExampleId])

  const active = selected?.scope === 'request'
    ? requestExamples.find((example) => example.id === selected.id)
    : selected?.scope === 'response'
      ? responses.find((response) => response.id === selected.responseId)?.examples?.find((example) => example.id === selected.id)
      : undefined

  const updateActive = (changes: Partial<EndpointExample>) => {
    if (!selected) return
    setValidationError(null)
    if (selected.scope === 'request') {
      setRequestExamples((items) => items.map((item) => item.id === selected.id ? { ...item, ...changes } : item))
      return
    }
    setResponses((items) => items.map((response) => response.id === selected.responseId
      ? { ...response, examples: (response.examples ?? []).map((item) => item.id === selected.id ? { ...item, ...changes } : item) }
      : response))
  }

  const addRequest = () => {
    const example = newExample(requestExamples)
    setRequestExamples((items) => [...items, example])
    setSelected({ scope: 'request', id: example.id })
  }

  const addResponse = (responseId: string) => {
    const response = responses.find((item) => item.id === responseId)
    if (!response) return
    const example = newExample(response.examples ?? [])
    setResponses((items) => items.map((item) => item.id === responseId
      ? { ...item, examples: [...(item.examples ?? []), example] }
      : item))
    setSelected({ scope: 'response', responseId, id: example.id })
  }

  const removeActive = () => {
    if (!selected) return
    if (selected.scope === 'request') {
      const next = requestExamples.filter((item) => item.id !== selected.id)
      setRequestExamples(next)
      setSelected(next[0] ? { scope: 'request', id: next[0].id } : null)
      return
    }
    setResponses((items) => items.map((response) => response.id === selected.responseId
      ? { ...response, examples: (response.examples ?? []).filter((item) => item.id !== selected.id) }
      : response))
    setSelected(null)
  }

  const save = useCallback(async () => {
    const dirty = JSON.stringify(requestExamples) !== JSON.stringify(endpoint.requestBody?.examples ?? [])
      || JSON.stringify(responses) !== JSON.stringify(endpoint.responses)
    if (!dirty) return
    const examples = [requestExamples, ...responses.map((response) => response.examples ?? [])].flat()
    for (const example of examples) {
      try {
        JSON.parse(example.value)
      } catch {
        setValidationError(`${example.name || 'Example'} contains invalid JSON.`)
        return
      }
    }
    setSaving(true)
    try {
      await onSave({
        requestBody: requestExamples.length
          ? {
              required: endpoint.requestBody?.required ?? false,
              contentType: endpoint.requestBody?.contentType ?? 'application/json',
              schema: endpoint.requestBody?.schema ?? [],
              ...endpoint.requestBody,
              examples: requestExamples,
            }
          : endpoint.requestBody ? { ...endpoint.requestBody, examples: [] } : undefined,
        responses,
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1400)
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Examples could not be saved.')
    } finally {
      setSaving(false)
    }
  }, [endpoint.requestBody, onSave, requestExamples, responses])

  useEffect(() => {
    const saveExamples = () => void save()
    window.addEventListener('api-studio:save', saveExamples)
    return () => window.removeEventListener('api-studio:save', saveExamples)
  }, [save])

  return (
    <div className="grid min-h-full grid-cols-[220px_minmax(0,1fr)] bg-base">
      <aside className="border-r border-border bg-overlay/50">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Contract examples</span>
          {dirty && (
            <span className="relative flex h-2.5 w-2.5" title="Unsaved changes" aria-label="Unsaved changes">
              <span className="absolute inset-0 animate-ping rounded-full bg-warning/40 motion-reduce:animate-none" />
              <span className="relative m-0.5 h-1.5 w-1.5 rounded-full bg-warning shadow-[0_0_6px_rgba(249,226,175,0.45)]" />
            </span>
          )}
          <Button variant="ghost" size="sm" iconOnly onClick={() => void save()} loading={saving} aria-label="Save contract examples">
            {saved ? <Check className="h-3.5 w-3.5 text-success" /> : <Save className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <div className="p-2">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-bold text-text-secondary">Request</span>
            <button type="button" onClick={addRequest} className="p-1 text-text-muted hover:text-primary" aria-label="Add request example"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {requestExamples.length === 0 && <p className="px-2 pb-2 text-[10px] text-text-muted">No request example</p>}
          {requestExamples.map((example) => (
            <button key={example.id} type="button" onClick={() => setSelected({ scope: 'request', id: example.id })} className={cn('sidebar-item font-mono text-[11px]', selected?.scope === 'request' && selected.id === example.id && 'active')}>
              <FileJson2 className="h-3.5 w-3.5" /><span className="truncate">{example.name}</span>
            </button>
          ))}

          <div className="my-2 border-t border-border" />
          {responses.map((response) => (
            <div key={response.id} className="mb-2">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="font-mono text-xs font-bold text-success">{response.statusCode}</span>
                <button type="button" onClick={() => addResponse(response.id)} className="p-1 text-text-muted hover:text-primary" aria-label={`Add ${response.statusCode} response example`}><Plus className="h-3.5 w-3.5" /></button>
              </div>
              {(response.examples ?? []).map((example) => (
                <button key={example.id} type="button" onClick={() => setSelected({ scope: 'response', responseId: response.id, id: example.id })} className={cn('sidebar-item font-mono text-[11px]', selected?.scope === 'response' && selected.id === example.id && 'active')}>
                  <FileJson2 className="h-3.5 w-3.5" /><span className="truncate">{example.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <div className="min-w-0 p-4">
        {!active ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
            <FileJson2 className="mb-3 h-7 w-7 text-text-muted" />
            <p className="text-xs font-bold text-text-secondary">No example selected</p>
            <p className="mt-1 max-w-sm text-[11px] text-text-muted">Add a request or response example to define the shared FE/BE contract.</p>
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col">
            <div className="mb-3 grid grid-cols-[minmax(120px,0.7fr)_minmax(180px,1.3fr)_36px] gap-2">
              <input value={active.name} onChange={(event) => updateActive({ name: event.target.value.replace(/\s+/g, '_') })} placeholder="example_name" className="h-9 border border-border bg-overlay px-3 font-mono text-xs outline-none focus:border-primary" />
              <input value={active.summary ?? ''} onChange={(event) => updateActive({ summary: event.target.value })} placeholder="What this example represents" className="h-9 border border-border bg-overlay px-3 text-xs outline-none focus:border-primary" />
              <button type="button" onClick={removeActive} className="flex items-center justify-center border border-border text-text-muted hover:border-danger/50 hover:text-danger" aria-label="Delete example"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <CodeEditor value={active.value} onChange={(value) => updateActive({ value })} label="Example payload" className="min-h-[220px] flex-1 border border-border" />
            {validationError && (
              <div role="alert" className="mt-3 flex items-center gap-2 border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {validationError} Fix the JSON before saving.
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <p className={cn('text-[10px]', dirty ? 'text-warning' : 'text-text-muted')}>
                {dirty ? 'Unsaved changes · Ctrl+S to save' : 'All changes saved globally.'}
              </p>
              <Button variant="primary" size="sm" loading={saving} disabled={Boolean(validationError) || !dirty} onClick={() => void save()}>{saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}{saved ? 'Saved' : dirty ? 'Save contract' : 'Saved'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
