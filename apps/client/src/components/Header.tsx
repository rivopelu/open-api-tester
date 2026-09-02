import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Boxes,
  Cloud,
  Download,
  Eye,
  Home,
  PenTool,
  Play,
  Redo2,
  ShieldCheck,
  Bot,
  Undo2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { useUiStore } from '../store/useUiStore';
import { router } from '../routes';
import { apiSpecToOpenApi3 } from '@modern-api-studio/utils';
import { SaveConflictError, getErrorMessage } from '../lib/api';
import toast from 'react-hot-toast';
import { Button, ThemeToggle, Typography } from './ui';

const NAV_ITEMS = [
  { panel: 'home', label: 'Home', icon: Home },
  { panel: 'designer', label: 'Designer', icon: PenTool },
  { panel: 'converter', label: 'Converter', icon: ArrowLeftRight },
  { panel: 'schemas', label: 'Schemas', icon: Boxes },
  { panel: 'security', label: 'Security', icon: ShieldCheck },
  { panel: 'preview', label: 'Preview', icon: Eye },
] as const;

// ─── "Last saved X ago" helper ────────────────────────────────────────────────
function useTimeAgo(isoTs: string | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isoTs) return;
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, [isoTs]);

  const label = useMemo(() => {
    if (!isoTs) return '';
    const diff = Math.floor((now - new Date(isoTs).getTime()) / 1000);
    if (diff < 10) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [isoTs, now]);

  return label;
}

// ─── Conflict dialog ───────────────────────────────────────────────────────────
function ConflictDialog({
  changedBy,
  onOverwrite,
  onReload,
  onDismiss,
}: {
  changedBy: string;
  onOverwrite: () => void;
  onReload: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onDismiss}
    >
      <div
        className="w-[440px] max-w-[95vw] rounded-none border border-danger/40 bg-surface p-7 animate-slideIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-none bg-danger/15 text-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <Typography id="conflict-title" variant="heading-sm" as="h2">
              Save Conflict Detected
            </Typography>
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label="Dismiss" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Typography tone="secondary" variant="body-sm" className="mb-6">
          <strong className="text-danger">{changedBy}</strong> saved this project
          after you last loaded it. Your changes and theirs now conflict.
        </Typography>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={onReload} className="h-auto flex-col items-start py-3">
            <span className="flex items-center gap-2 font-semibold">
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              Reload theirs
            </span>
            <span className="text-xs font-normal text-text-muted">Discard your local edits</span>
          </Button>
          <Button variant="danger" onClick={onOverwrite} className="h-auto flex-col items-start py-3">
            <span className="flex items-center gap-2 font-semibold">
              <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
              Overwrite
            </span>
            <span className="text-xs font-normal text-white/65">Force-save your edits</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="w-full" onClick={onDismiss}>
          Cancel (keep editing without saving)
        </Button>
      </div>
    </div>
  );
}

export function Header() {
  const {
    spec, undo, redo, historyIndex, history,
    activeProjectId,
    saveProject, loadProject,
    lastSavedAt,
  } = useApiSpecStore();
  const { toggleAssistant, assistantOpen } = useUiStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [saving, setSaving] = useState(false);
  const [conflictMeta, setConflictMeta] = useState<{ changedBy: string; serverTs: string } | null>(null);

  const timeAgo = useTimeAgo(lastSavedAt);

  // ── Main save flow ──────────────────────────────────────────────────────────
  const executeSave = useCallback(async (forceOverwrite = false) => {
    if (!activeProjectId) return;

    setSaving(true);
    try {
      await saveProject(forceOverwrite);
      toast.success('Project saved');
      setConflictMeta(null);
    } catch (err: unknown) {
      if (err instanceof SaveConflictError) {
        setConflictMeta({ changedBy: 'Another user', serverTs: err.serverUpdatedAt });
      } else {
        toast.error(`Save failed: ${getErrorMessage(err, 'Unknown error')}`);
      }
    } finally {
      setSaving(false);
    }
  }, [activeProjectId, saveProject]);

  const handleSave = useCallback(() => executeSave(false), [executeSave]);
  const handleConflictOverwrite = () => executeSave(true);

  const handleConflictReload = async () => {
    if (!activeProjectId) return;
    await loadProject(activeProjectId);
    setConflictMeta(null);
    toast.success('Reloaded latest version');
  };

  const handleExportYaml = () => {
    const yamlStr = apiSpecToOpenApi3(spec, 'yaml');
    downloadFile(yamlStr, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.yaml`, 'text/yaml');
    toast.success('Exported as YAML');
  };

  const handleExportJson = () => {
    const json = apiSpecToOpenApi3(spec, 'json');
    downloadFile(json, `${spec.info.title.replace(/\s+/g, '-').toLowerCase()}-openapi.json`, 'application/json');
    toast.success('Exported as JSON');
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeProjectId) {
        e.preventDefault();
        if (!saving) handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, activeProjectId, handleSave]);

  const saveTooltip = saving
    ? 'Saving…'
    : `Save to server${lastSavedAt ? ` · last saved ${timeAgo}` : ''} (Ctrl+S)`;

  return (
    <>
      <header className="z-[100] flex h-[56px] shrink-0 items-center border-b border-border bg-surface px-4">
        {/* Logo / Back */}
        <div className="mr-6 flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Back to Projects"
            onClick={() => navigate(router.dashboard())}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="glow-blue grid h-8 w-8 place-items-center rounded-none bg-linear-to-br from-primary to-purple text-base">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="leading-none">
            <div className="text-sm font-bold text-text-primary">Max API Studio</div>
            <div className="mt-0.5 text-[10px] leading-none text-text-muted">Modern OpenAPI Designer</div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Editor panels" className="flex flex-1 gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon: LucideIcon = item.icon;
            const path = router.editor.panel(item.panel);
            const isActive = item.panel === 'home'
              ? pathname === path
              : pathname.startsWith(path);
            return (
              <button
                key={item.panel}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                className={`tab flex items-center gap-1.5 ${isActive ? 'active' : ''}`}
                onClick={() => navigate(path)}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Undo"
            data-tooltip="Undo"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Redo"
            data-tooltip="Redo"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

          <Button variant="ghost" size="sm" onClick={handleExportYaml} data-tooltip="Export as YAML">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            YAML
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportJson} data-tooltip="Export as JSON">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </Button>

          {activeProjectId && (
            <div className="relative flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                loading={saving}
                disabled={saving}
                data-tooltip={saveTooltip}
              >
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                Save
              </Button>
              {lastSavedAt && !saving && (
                <span className="text-[10px] whitespace-nowrap text-text-muted" aria-live="polite">
                  {timeAgo}
                </span>
              )}
            </div>
          )}

          <Button variant="primary" size="sm" onClick={() => navigate(router.editor.panel('preview'))}>
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Preview
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={toggleAssistant}
            className="gap-1.5"
            data-tooltip="AI Assistant"
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden md:inline">AI Assistant</span>
          </Button>

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

          <ThemeToggle />
        </div>
      </header>

      {/* Conflict dialog */}
      {conflictMeta && (
        <ConflictDialog
          changedBy={conflictMeta.changedBy}
          onOverwrite={handleConflictOverwrite}
          onReload={handleConflictReload}
          onDismiss={() => setConflictMeta(null)}
        />
      )}
    </>
  );
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
