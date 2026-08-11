import { useState } from 'react';
import type { EndpointExample } from '@modern-api-studio/types';
import { v4 as uuidv4 } from 'uuid';
import { Braces, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Typography } from '../ui';
import { JsonEditor } from './JsonEditor';

interface Props {
  examples: EndpointExample[];
  onChange: (examples: EndpointExample[]) => void;
  onGenerateFromSchema?: () => void;
}

export function ExampleEditor({ examples = [], onChange, onGenerateFromSchema }: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(examples.length > 0 ? examples[0].id : null);
  const activeExample = examples.find((example) => example.id === activeTab) ?? examples[0];

  const addExample = () => {
    const newEx: EndpointExample = {
      id: uuidv4(),
      name: `example_${examples.length + 1}`,
      summary: '',
      value: '{\n  \n}'
    };
    const newExamples = [...examples, newEx];
    onChange(newExamples);
    setActiveTab(newEx.id);
  };

  const removeExample = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExamples = examples.filter((ex) => ex.id !== id);
    onChange(newExamples);
    if (activeExample?.id === id) {
      setActiveTab(newExamples.length > 0 ? newExamples[0].id : null);
    }
  };

  const updateExample = (id: string, changes: Partial<EndpointExample>) => {
    onChange(examples.map((ex) => ex.id === id ? { ...ex, ...changes } : ex));
  };

  return (
    <div className="flex min-h-0 flex-col bg-base">
      <div className="flex min-h-12 flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div>
            <Typography variant="label" as="h3">Examples</Typography>
            <Typography variant="caption" tone="muted" as="p" className="mt-0.5">
              Define named JSON payloads for documentation and testing.
            </Typography>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onGenerateFromSchema && (
            <Button type="button" variant="outline" size="sm" onClick={onGenerateFromSchema}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Generate from schema
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={addExample}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add example
          </Button>
        </div>
      </div>

      {examples.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center border border-border bg-overlay text-text-muted">
            <Braces className="h-4 w-4" aria-hidden="true" />
          </span>
          <Typography variant="label" as="p" className="mb-1">No examples yet</Typography>
          <Typography variant="body-sm" tone="muted" className="mb-4 max-w-sm">
            Add a payload manually or generate one from the current schema.
          </Typography>
          <Button type="button" variant="primary" size="sm" onClick={addExample}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add first example
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex overflow-x-auto border-b border-border bg-overlay" role="tablist" aria-label="Payload examples">
            {examples.map((ex) => (
              <div key={ex.id} className={`flex shrink-0 items-center border-r border-border ${activeExample?.id === ex.id ? 'bg-surface text-text-primary' : 'text-text-muted'}`}>
                <button
                  type="button"
                  role="tab"
                  id={`example-tab-${ex.id}`}
                  aria-controls={`example-panel-${ex.id}`}
                  aria-selected={activeExample?.id === ex.id}
                  onClick={() => setActiveTab(ex.id)}
                  className={`h-10 max-w-48 truncate border-b-2 px-3 font-mono text-xs font-semibold transition-colors ${activeExample?.id === ex.id ? 'border-primary text-primary' : 'border-transparent hover:bg-card hover:text-text-primary'}`}
                >
                  {ex.name || 'Unnamed example'}
                </button>
                <button
                  type="button"
                  onClick={(e) => removeExample(ex.id, e)}
                  className="mr-1 flex h-7 w-7 items-center justify-center text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  aria-label={`Delete example ${ex.name || 'Unnamed example'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {activeExample && (
            <div
              role="tabpanel"
              id={`example-panel-${activeExample.id}`}
              aria-labelledby={`example-tab-${activeExample.id}`}
              className="min-w-0 bg-base"
            >
              <div className="grid border-b border-border md:grid-cols-[minmax(160px,0.8fr)_minmax(240px,1.2fr)]">
                <label className="min-w-0 border-b border-border bg-surface p-3 md:border-b-0 md:border-r">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Example name</span>
                  <input
                    value={activeExample.name || ''}
                    onChange={(e) => updateExample(activeExample.id, { name: e.target.value.replace(/\s+/g, '_') })}
                    placeholder="success_200"
                    className="h-9 w-full border border-border bg-base px-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                  />
                </label>
                <label className="min-w-0 bg-surface p-3">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">Summary <span className="font-normal normal-case tracking-normal">(optional)</span></span>
                  <input
                    value={activeExample.summary || ''}
                    onChange={(e) => updateExample(activeExample.id, { summary: e.target.value })}
                    placeholder="Successful response payload"
                    className="h-9 w-full border border-border bg-base px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                  />
                </label>
              </div>

              <div className="min-w-0">
                <div className="flex h-10 items-center justify-between gap-3 border-b border-border bg-surface px-4">
                  <Typography variant="label" as="span">JSON payload</Typography>
                  <Typography variant="caption" tone="muted">JSONC comments supported</Typography>
                </div>
                <div className="p-3">
                  <JsonEditor
                    value={activeExample.value || ''}
                    onChange={(value) => updateExample(activeExample.id, { value })}
                    placeholder={'{\n  "key": "value"\n}'}
                    minHeight={180}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
