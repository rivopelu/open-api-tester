import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from 'lucide-react';
import { Button } from '../ui';
import { formatToolLabel } from '../../lib/toolLabels';
import { cn } from '../../lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ToolCallEvent {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed';
  resultSummary?: string;
}

export interface AssistantResponseProps {
  id: string;
  content: string;
  status?: 'idle' | 'loading' | 'streaming' | 'error';
  errorMessage?: string;
  modelLabel?: string;
  modelProvider?: string;
  toolEvents?: ToolCallEvent[];
  onRegenerate?: () => void;
  onFeedback?: (type: 'up' | 'down') => void;
}

export function AssistantResponseView({
  content,
  status = 'idle',
  errorMessage,
  modelLabel,
  modelProvider,
  toolEvents = [],
  onRegenerate,
  onFeedback,
}: AssistantResponseProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [eventsOpen, setEventsOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVote = (type: 'up' | 'down') => {
    setFeedback((prev) => (prev === type ? null : type));
    onFeedback?.(type);
  };

  const isLoading = status === 'loading' || status === 'streaming';
  const runningTools = toolEvents.filter((t) => t.status === 'running');
  const lastRunningTool = runningTools[runningTools.length - 1];

  return (
    <div className="flex flex-col items-start space-y-3 w-full">
      {/* ── Main Response Content (Markdown) ───────────────────────── */}
      <div className="w-full">
        {content ? (
          <MarkdownRenderer content={content} />
        ) : null}

        {/* ── Live Thinking / Status Indicator (Under the message / when starting) ── */}
        {isLoading && (
          <div className="flex items-center gap-2.5 py-1.5 text-xs text-text-muted select-none">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
            <span className="font-medium text-text-secondary animate-pulse text-[13px]">
              {lastRunningTool
                ? `${formatToolLabel(lastRunningTool.name)}…`
                : content
                  ? 'Thinking and generating…'
                  : 'Thinking…'}
            </span>
          </div>
        )}

        {/* Streaming Cursor */}
        {status === 'streaming' && (
          <span className="inline-block h-3.5 w-1.5 ml-1 animate-pulse bg-primary align-middle" />
        )}

        {/* Error State */}
        {status === 'error' && errorMessage && (
          <div className="mt-2 border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            <p className="font-semibold">Failed to generate response</p>
            <p className="mt-0.5 opacity-90">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* ── Tool Call Execution Events (Placed below response, subtle & collapsible) ── */}
      {toolEvents.length > 0 && (
        <div className="w-full border border-border/70 bg-surface/70 text-xs">
          <button
            type="button"
            onClick={() => setEventsOpen(!eventsOpen)}
            className="flex w-full items-center justify-between px-3 py-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-[11px] tracking-wide uppercase">
                Tools Used ({toolEvents.length})
              </span>
            </div>
            {eventsOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
            )}
          </button>

          {eventsOpen && (
            <div className="border-t border-border/70 px-3 py-2.5 bg-base/60">
              {toolEvents.map((evt, index) => {
                const isLast = index === toolEvents.length - 1;
                return (
                  <div key={evt.id} className="flex gap-2.5">
                    <div className="flex w-3 shrink-0 flex-col items-center">
                      <span
                        className={cn(
                          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                          evt.status === 'running'
                            ? 'bg-primary animate-pulse'
                            : evt.status === 'completed'
                              ? 'bg-success'
                              : 'bg-danger',
                        )}
                      />
                      {!isLast && (
                        <span className="w-px flex-1 bg-border/70" aria-hidden="true" />
                      )}
                    </div>
                    <div className={cn('min-w-0 flex-1', !isLast && 'pb-3')}>
                      <div className="flex items-center gap-1.5">
                        {evt.status === 'running' && (
                          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-text-primary">
                          {formatToolLabel(evt.name)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-[10.5px]',
                          evt.status === 'failed' ? 'text-danger' : 'text-text-muted',
                        )}
                      >
                        {evt.resultSummary ||
                          (evt.status === 'running' ? 'Executing…' : 'Done')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Action Toolbar (Design System Button Component) ────────── */}
      {!isLoading && content && (
        <div className="flex items-center gap-1 pt-1 text-text-muted">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Good response"
            title="Good response"
            onClick={() => handleVote('up')}
            className={`h-7 w-7 ${feedback === 'up' ? 'text-primary bg-primary/10' : ''}`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Bad response"
            title="Bad response"
            onClick={() => handleVote('down')}
            className={`h-7 w-7 ${feedback === 'down' ? 'text-danger bg-danger/10' : ''}`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>

          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Regenerate"
              title="Regenerate response"
              onClick={onRegenerate}
              className="h-7 w-7"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Copy response"
            title="Copy response"
            onClick={handleCopy}
            className="h-7 w-7"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="More options"
            title="More options"
            className="h-7 w-7"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Model Notice / Provider Badge ──────────────────────────── */}
      {modelLabel && !isLoading && (
        <div className="mt-1 flex items-start gap-2.5 border border-border/70 bg-surface/60 p-2.5 text-xs text-text-secondary w-full">
          <Info className="h-3.5 w-3.5 shrink-0 text-text-muted mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold text-text-primary text-[11px]">
              {modelLabel} {modelProvider ? `(${modelProvider})` : ''}
            </span>
            <span className="text-[10px] text-text-muted">
              Generated via OpenAI-compatible Mastra backend gateway.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
