import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, MousePointerClick } from 'lucide-react';
import { useApiSpecStore } from '../../store/useApiSpecStore';
import { useUiStore } from '../../store/useUiStore';
import { EndpointDetail } from './EndpointDetail';
// ApiInfoForm moved to home tab
import { apiSpecToOpenApi3 } from '@modern-api-studio/utils';
import MonacoEditor from '@monaco-editor/react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Button, Typography } from '../ui';

export function DesignerPanel() {
  const { spec, activeEndpointId } = useApiSpecStore();
  const { editorMode, setEditorMode } = useUiStore();
  const activeEndpoint = spec.endpoints.find((e) => e.id === activeEndpointId);
  const [liveView, setLiveView] = useState<'code' | 'swagger'>('code');

  const yamlOutput = apiSpecToOpenApi3(spec, 'yaml');
  const jsonOutput = apiSpecToOpenApi3(spec, 'json');

  return (
    <div className="flex h-full min-w-0 overflow-hidden">
      {/* Left: Visual editor */}
      <div className="flex min-w-0 flex-[0_0_55%] flex-col overflow-hidden border-r border-border">
        {/* Mode tabs */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-2">
          <div className="tabs">
            <button type="button" className={`tab ${editorMode === 'visual' ? 'active' : ''}`} onClick={() => setEditorMode('visual')}>Visual</button>
            <button type="button" className={`tab ${editorMode === 'yaml' ? 'active' : ''}`} onClick={() => setEditorMode('yaml')}>YAML</button>
            <button type="button" className={`tab ${editorMode === 'json' ? 'active' : ''}`} onClick={() => setEditorMode('json')}>JSON</button>
          </div>
          {activeEndpoint && editorMode === 'visual' && (
            <div className="ml-2 flex min-w-0 items-center gap-2">
              <span className={`method-badge badge-${activeEndpoint.method.toLowerCase()}`}>{activeEndpoint.method}</span>
              <span className="truncate font-mono text-xs text-text-secondary">{activeEndpoint.path}</span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {editorMode === 'visual' ? (
            <div className="scroll-y flex h-full flex-col gap-4 p-4">
              {!activeEndpoint ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-none border border-border bg-surface">
                    <MousePointerClick className="h-7 w-7 text-primary" aria-hidden="true" />
                  </span>
                  <Typography variant="heading-sm" tone="secondary">No Endpoint Selected</Typography>
                  <Typography variant="body-sm" tone="muted" className="max-w-[300px]">
                    Select an endpoint from the sidebar or click “+ Add Endpoint” to start designing.
                  </Typography>
                </div>
              ) : (
                <EndpointDetail endpoint={activeEndpoint} />
              )}
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language={editorMode === 'yaml' ? 'yaml' : 'json'}
              value={editorMode === 'yaml' ? yamlOutput : jsonOutput}
              theme="vs-dark"
              options={{
                minimap: { enabled: true },
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                readOnly: true,
                tabSize: 2,
              }}
            />
          )}
        </div>
      </div>

      {/* Right: Live Output */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
          <div className="tabs">
            <button type="button" className={`tab ${liveView === 'code' ? 'active' : ''}`} onClick={() => setLiveView('code')}>Code Output</button>
            <button type="button" className={`tab ${liveView === 'swagger' ? 'active' : ''}`} onClick={() => setLiveView('swagger')}>Swagger Preview</button>
          </div>
          {liveView === 'code' && (
            <div className="flex gap-1.5">
              <CopyButton text={yamlOutput} label="YAML" />
              <CopyButton text={jsonOutput} label="JSON" />
            </div>
          )}
        </div>

        {liveView === 'code' ? (
          <MonacoEditor
            height="100%"
            language="yaml"
            value={yamlOutput}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        ) : (
          // SwaggerUI bundles its own light theme, so it intentionally renders on
          // a white canvas instead of the app's dark palette.
          <div className="scroll-y h-full bg-white">
            <SwaggerUI spec={JSON.parse(jsonOutput)} />
          </div>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} aria-label={`Copy ${label} output`}>
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
