import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronDown, CircleDot, Plus, Settings2, Trash2 } from 'lucide-react'
import { Button, Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle, Popover } from './ui'
import { type ApiEnvironment, useEnvironmentStore } from '../store/useEnvironmentStore'
import { useAuthStore } from '../store/useAuthStore'

interface VariableRow {
  id: string
  key: string
  value: string
}

const blankRow = (): VariableRow => ({ id: crypto.randomUUID(), key: '', value: '' })

export function EnvironmentSelector({ compact = false }: { compact?: boolean }) {
  const { environments, activeEnvironmentId, selectEnvironment, saveEnvironment, deleteEnvironment, loadEnvironments } = useEnvironmentStore()
  const accountId = useAuthStore((state) => state.user?.id)
  const active = environments.find((environment) => environment.id === activeEnvironmentId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<VariableRow[]>([blankRow()])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  useEffect(() => {
    if (accountId) void loadEnvironments()
  }, [accountId, loadEnvironments])

  const edit = (environment?: ApiEnvironment) => {
    setEditingId(environment?.id ?? null)
    setName(environment?.name ?? '')
    const variables = Object.entries(environment?.variables ?? {}).map(([key, value]) => ({ id: crypto.randomUUID(), key, value }))
    setRows(variables.length ? variables : [blankRow()])
    setSettingsOpen(true)
  }

  const save = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    saveEnvironment({
      id: editingId ?? crypto.randomUUID(),
      name: trimmedName,
      variables: Object.fromEntries(rows.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])),
    })
    setSettingsOpen(false)
  }

  return (
    <>
      <Popover
        align="end"
        className="w-64"
        trigger={({ open }) => (
          <button
            type="button"
            className={`flex h-8 items-center gap-2 border px-2.5 text-xs font-semibold transition-colors ${open ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-overlay text-text-secondary hover:text-text-primary'}`}
          >
            <CircleDot className={`h-3.5 w-3.5 ${active ? 'text-success' : 'text-text-muted'}`} />
            {!compact && <span className="max-w-[130px] truncate">{active?.name ?? 'No environment'}</span>}
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>
        )}
      >
        {({ close }) => (
          <div>
            <p className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Active environment</p>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={!activeEnvironmentId}
              onClick={() => { selectEnvironment(null); close() }}
              className="sidebar-item"
            >
              <span className="w-4">{!activeEnvironmentId && <Check className="h-3.5 w-3.5 text-primary" />}</span>
              No environment
            </button>
            {environments.map((environment) => (
              <button
                key={environment.id}
                type="button"
                role="menuitemradio"
                aria-checked={environment.id === activeEnvironmentId}
                onClick={() => { selectEnvironment(environment.id); close() }}
                className="sidebar-item"
              >
                <span className="w-4">{environment.id === activeEnvironmentId && <Check className="h-3.5 w-3.5 text-success" />}</span>
                <span className="min-w-0 flex-1 truncate">{environment.name}</span>
                <span className="font-mono text-[9px] text-text-muted">{Object.keys(environment.variables).length}</span>
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button type="button" className="sidebar-item" onClick={() => { close(); edit(active) }}>
              <Settings2 className="h-3.5 w-3.5" /> Manage environments
            </button>
          </div>
        )}
      </Popover>

      <Modal open={settingsOpen} onClose={closeSettings} size="lg">
        <ModalHeader icon={<Settings2 className="h-4 w-4" />}>
          <ModalTitle>Environment settings</ModalTitle>
          <ModalDescription>Variables are global and available in requests as {'{{variable}}'}.</ModalDescription>
        </ModalHeader>
        <ModalBody className="grid min-h-[360px] grid-cols-[180px_minmax(0,1fr)] gap-0 p-0">
          <aside className="border-r border-border bg-overlay p-2">
            {environments.map((environment) => (
              <button
                key={environment.id}
                type="button"
                onClick={() => edit(environment)}
                className={`sidebar-item ${editingId === environment.id ? 'active' : ''}`}
              >
                <CircleDot className="h-3.5 w-3.5" /><span className="truncate">{environment.name}</span>
              </button>
            ))}
            <button type="button" onClick={() => edit()} className="sidebar-item mt-1 border-t border-border pt-2">
              <Plus className="h-3.5 w-3.5" /> New environment
            </button>
          </aside>
          <div className="min-w-0 p-5">
            <label className="mb-2 block text-xs font-bold text-text-secondary">Environment name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Development" className="mb-5 h-9 w-full border border-border bg-base px-3 text-sm outline-none focus:border-primary" />
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-text-secondary">Variables</label>
              <span className="font-mono text-[10px] text-text-muted">Use {'{{key}}'} in URLs, headers, auth, and body</span>
            </div>
            <div className="border border-border bg-base">
              <div className="grid grid-cols-[1fr_1.4fr_36px] border-b border-border bg-overlay text-[10px] font-bold uppercase tracking-wide text-text-muted">
                <span className="px-3 py-2">Variable</span><span className="border-l border-border px-3 py-2">Value</span><span />
              </div>
              {rows.map((row, index) => (
                <div key={row.id} className="group grid grid-cols-[1fr_1.4fr_36px] border-b border-border last:border-b-0">
                  <input value={row.key} onChange={(event) => setRows(rows.map((item, rowIndex) => rowIndex === index ? { ...item, key: event.target.value } : item))} placeholder="token" className="min-w-0 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:bg-surface" />
                  <input value={row.value} onChange={(event) => setRows(rows.map((item, rowIndex) => rowIndex === index ? { ...item, value: event.target.value } : item))} placeholder="Value" className="min-w-0 border-l border-border bg-transparent px-3 py-2 font-mono text-xs outline-none focus:bg-surface" />
                  <button type="button" onClick={() => setRows(rows.filter((_, rowIndex) => rowIndex !== index))} className="text-text-muted opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Delete variable"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setRows([...rows, blankRow()])} className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-xs text-text-muted hover:bg-surface hover:text-text-primary"><Plus className="h-3.5 w-3.5" /> Add variable</button>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="justify-between">
          <Button variant="danger" size="sm" disabled={!editingId} onClick={() => {
            if (!editingId || !window.confirm('Delete this environment?')) return
            deleteEnvironment(editingId)
            setEditingId(null)
            setName('')
            setRows([blankRow()])
          }}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
          <div className="flex gap-2"><Button variant="ghost" onClick={closeSettings}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={save}>Save environment</Button></div>
        </ModalFooter>
      </Modal>
    </>
  )
}
