import { useCallback, useId, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Download,
  FileText,
  FileUp,
  Reply,
  Send,
  Tags,
  X,
  Zap,
} from 'lucide-react';
import { parseOpenApiToSpec } from '../lib/yamlImporter';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { getErrorMessage } from '../lib/api';
import { Button, Input, Spinner, Typography } from './ui';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { ApiSpec } from '@modern-api-studio/types';

interface ImportYamlModalProps {
  onClose: () => void;
  /** Called after a project is successfully created & imported */
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'saving';

const STEPS: Step[] = ['upload', 'preview'];

export function ImportYamlModal({ onClose, onImported }: ImportYamlModalProps) {
  const titleId = useId();
  const [step, setStep] = useState<Step>('upload');
  const [rawText, setRawText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedSpec, setParsedSpec] = useState<ApiSpec | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File helpers ────────────────────────────────────────────────────────────

  const loadFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      setRawText(typeof result === 'string' ? result : '');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const openFilePicker = () => fileInputRef.current?.click();

  // ── Parse & preview ─────────────────────────────────────────────────────────

  const handleParse = () => {
    if (!rawText.trim()) { toast.error('Paste YAML/JSON or drop a file first'); return; }
    try {
      const { spec, warnings } = parseOpenApiToSpec(rawText);
      setParsedSpec(spec);
      setWarnings(warnings);
      setProjectName(spec.info.title || 'Imported API');
      setStep('preview');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to parse the spec'));
    }
  };

  // ── Save to server ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!parsedSpec) return;
    if (!projectName.trim()) { toast.error('Enter a project name'); return; }

    setStep('saving');

    try {
      const finalSpec: ApiSpec = {
        ...parsedSpec,
        id: uuidv4(),
        info: { ...parsedSpec.info, title: projectName.trim() },
      };

      const ok = await useApiSpecStore.getState().importProject(projectName.trim(), finalSpec);
      if (!ok) throw new Error('Failed to import project');

      toast.success(`"${projectName.trim()}" imported successfully!`);
      onImported();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to import project'));
      setStep('preview');
    }
  };

  const stepIndex = STEPS.indexOf(step === 'saving' ? 'preview' : step);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 'saving') onClose(); }}
    >
      <div className="flex max-h-[90vh] w-155 max-w-[95vw] flex-col overflow-hidden rounded-none border border-border bg-surface animate-slideIn">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-border bg-linear-to-br from-primary/10 via-transparent to-purple/10 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="glow-blue grid h-9 w-9 shrink-0 place-items-center rounded-none bg-linear-to-br from-primary to-purple text-base">
              <Download className="h-4 w-4 text-base" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <Typography id={titleId} as="h2" variant="heading-sm" className="truncate">
                Import OpenAPI Spec
              </Typography>
              <Typography tone="muted" variant="caption">
                {step === 'upload'
                  ? 'YAML / JSON — OpenAPI 3.x or Swagger 2.x'
                  : step === 'preview'
                    ? 'Review parsed result before importing'
                    : 'Saving…'}
              </Typography>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Step indicator */}
            <ol className="flex items-center gap-2" aria-label="Import progress">
              {STEPS.map((s, i) => {
                const done = stepIndex > i || step === 'saving';
                const current = stepIndex === i;
                return (
                  <li key={s} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-border" />}
                    <span
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold transition-colors duration-200',
                        current
                          ? 'border-primary bg-primary text-base'
                          : done
                            ? 'border-success/40 bg-success/15 text-success'
                            : 'border-border bg-overlay text-text-muted',
                      )}
                    >
                      {done && !current ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
                    </span>
                  </li>
                );
              })}
            </ol>

            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Close import dialog"
              onClick={onClose}
              disabled={step === 'saving'}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Body */}
        {step === 'upload' && (
          <div className="scroll-y flex flex-col gap-4 p-6">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label={fileName ? `Selected file ${fileName}. Choose a different file.` : 'Choose an OpenAPI file'}
              onClick={openFilePicker}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); }
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-none border-2 border-dashed px-5 py-8 text-center transition-colors duration-200',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-overlay hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              {fileName ? (
                <CheckCircle2 className="mb-1 h-8 w-8 text-success" aria-hidden="true" />
              ) : (
                <FileUp className="mb-1 h-8 w-8 text-text-muted" aria-hidden="true" />
              )}
              <Typography variant="body-sm" tone="secondary" className="font-semibold">
                {fileName ? fileName : 'Drag & drop your OpenAPI file here'}
              </Typography>
              <Typography variant="caption" tone="muted">
                Supports .yaml, .yml, .json — OpenAPI 3.x &amp; Swagger 2.x
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept=".yaml,.yml,.json"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            {/* Paste area */}
            <div className="flex flex-col gap-1.5">
              <Typography as="label" htmlFor="import-paste" variant="label" tone="secondary">
                Or paste YAML / JSON directly
              </Typography>
              <textarea
                id="import-paste"
                value={rawText}
                onChange={(e) => { setRawText(e.target.value); setFileName(null); }}
                placeholder={'openapi: 3.0.3\ninfo:\n  title: My API\n  version: 1.0.0\npaths:\n  /users:\n    get:\n      summary: List users\n      responses:\n        \'200\':\n          description: OK'}
                spellCheck={false}
                className="input input-mono min-h-[200px] w-full resize-y"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleParse} disabled={!rawText.trim()}>
                Parse &amp; Preview
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && parsedSpec && (
          <div className="scroll-y flex flex-col gap-4 p-6">
            {/* Warnings */}
            {warnings.length > 0 && (
              <div role="alert" className="rounded-none border border-warning/30 bg-warning/10 px-3.5 py-2.5">
                <Typography variant="label" tone="warning" className="mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Warnings
                </Typography>
                <ul className="flex flex-col gap-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-xs text-warning/85">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                { label: 'Endpoints', value: parsedSpec.endpoints.length, icon: Zap },
                { label: 'Tags', value: parsedSpec.tags.length, icon: Tags },
                { label: 'Schemas', value: parsedSpec.components.schemas.length, icon: Boxes },
                { label: 'With Body', value: parsedSpec.endpoints.filter((e) => e.requestBody).length, icon: Send },
                { label: 'Responses', value: parsedSpec.endpoints.reduce((n, e) => n + e.responses.length, 0), icon: Reply },
                {
                  label: 'Examples',
                  value: parsedSpec.endpoints.reduce(
                    (n, e) => n + e.responses.reduce((m, r) => m + (r.examples?.length ?? 0), 0) + (e.requestBody?.examples?.length ?? 0),
                    0,
                  ),
                  icon: FileText,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-none border border-border bg-overlay p-3 text-center">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-lg font-bold leading-none text-text-primary">{value}</span>
                  <span className="text-[11px] leading-tight text-text-muted">{label}</span>
                </div>
              ))}
            </div>

            {/* API info */}
            <div className="rounded-none border border-border bg-overlay px-4 py-3">
              <Typography variant="label" tone="secondary" className="mb-1">API Info</Typography>
              <Typography variant="body-sm" className="font-semibold">{parsedSpec.info.title}</Typography>
              {parsedSpec.info.description && (
                <Typography variant="caption" tone="muted" className="mt-0.5 leading-relaxed">
                  {parsedSpec.info.description.slice(0, 150)}{parsedSpec.info.description.length > 150 ? '…' : ''}
                </Typography>
              )}
              <Typography variant="caption" tone="muted" className="mt-1">
                Version {parsedSpec.info.version} · {parsedSpec.openApiVersion === 'swagger2' ? 'Swagger 2.0' : 'OpenAPI 3.x'}
              </Typography>
            </div>

            {/* Endpoint preview list */}
            {parsedSpec.endpoints.length > 0 && (
              <div className="flex flex-col gap-2">
                <Typography variant="label" tone="secondary">Endpoints preview (first 8)</Typography>
                <ul className="flex flex-col gap-1">
                  {parsedSpec.endpoints.slice(0, 8).map((ep) => (
                    <li key={ep.id} className="flex items-center gap-2.5 rounded-none border border-border bg-overlay px-2.5 py-1.5">
                      <span className={cn('method-badge shrink-0', `badge-${ep.method.toLowerCase()}`)}>{ep.method}</span>
                      <span className="min-w-0 truncate font-mono text-xs text-text-secondary">{ep.path}</span>
                      {ep.summary && <span className="ml-auto hidden truncate text-[11px] text-text-muted sm:inline">{ep.summary.slice(0, 40)}</span>}
                    </li>
                  ))}
                </ul>
                {parsedSpec.endpoints.length > 8 && (
                  <Typography variant="caption" tone="muted">
                    + {parsedSpec.endpoints.length - 8} more endpoints
                  </Typography>
                )}
              </div>
            )}

            {/* Project name */}
            <Input
              label="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name…"
              mono
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!projectName.trim()}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Import as Project
              </Button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Spinner size="lg" />
            <Typography tone="muted" variant="body-sm">Saving project…</Typography>
          </div>
        )}
      </div>
    </div>
  );
}
