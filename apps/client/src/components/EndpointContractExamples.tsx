import { useEffect, useState } from 'react'
import type { Endpoint, EndpointExample, ResponseDefinition } from '@modern-api-studio/types'
import { Check, FileJson2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from './ui'
import { cn } from '../lib/utils'

interface Props {
  endpoint: Endpoint
  onSave: (contract: Pick<Endpoint, 'requestBody' | 'responses'>) => Promise<void>
}

type SelectedExample = { scope: 'request'; id: string } | { scope: 'response'; responseId: string; id: string }

const newExample = (index: number): EndpointExample => ({
  id: crypto.randomUUID(),
  name: `example_${index + 1}`,
  summary: '',
  value: '{\n  \n}',
})

export function EndpointContractExamples({ endpoint, onSave }: Props) {
  const [requestExamples, setRequestExamples] = useState<EndpointExample[]>([])
  const [responses, setResponses] = useState<ResponseDefinition[]>([])
  const [selected, setSelected] = useState<SelectedExample | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const request = endpoint.requestBody?.examples ?? []
    setRequestExamples(request)
    setResponses(endpoint.responses)
    setSelected(
      request[0]
        ? { scope: 'request', id: request[0].id }
        : endpoint.responses[0]?.examples?.[0]
          ? { scope: 'response', responseId: endpoint.responses[0].id, id: endpoint.responses[0].examples![0].id }
          : null,
    )
  }, [endpoint])

  const active = selected?.scope === 'request'
    ? requestExamples.find((example) => example.id === selected.id)
    : selected?.scope === 'response'
      ? responses.find((response) => response.id === selected.responseId)?.examples?.find((example) => example.id === selected.id)
      : undefined

  const updateActive = (changes: Partial<EndpointExample>) => {
    if (!selected) return
    if (selected.scope === 'request') {
      setRequestExamples((items) => items.map((item) => item.id === selected.id ? { ...item, ...changes } : item))
      return
    }
    setResponses((items) => items.map((response) => response.id === selected.responseId
      ? { ...response, examples: (response.examples ?? []).map((item) => item.id === selected.id ? { ...item, ...changes } : item) }
      : response))
  }

  const addRequest = () => {
    const example = newExample(requestExamples.length)
    setRequestExamples((items) => [...items, example])
    setSelected({ scope: 'request', id: example.id })
  }

  const addResponse = (responseId: string) => {
    const response = responses.find((item) => item.id === responseId)
    if (!response) return
    const example = newExample(response.examples?.length ?? 0)
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

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        requestBody: endpoint.requestBody ? { ...endpoint.requestBody, examples: requestExamples } : undefined,
        responses,
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1400)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid min-h-[260px] grid-cols-[220px_minmax(0,1fr)] border border-border bg-base">
      <aside className="border-r border-border bg-overlay/50">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Contract examples</span>
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
            <textarea value={active.value} onChange={(event) => updateActive({ value: event.target.value })} spellCheck={false} className="min-h-[180px] flex-1 resize-none border border-border bg-overlay p-4 font-mono text-xs leading-6 text-text-primary outline-none focus:border-primary" placeholder={'{\n  "id": 1\n}'} />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-text-muted">Persisted globally in this endpoint specification.</p>
              <Button variant="primary" size="sm" loading={saving} onClick={() => void save()}>{saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}{saved ? 'Saved' : 'Save contract'}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
