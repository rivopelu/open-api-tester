import { useEffect, useId, useState, type FormEvent } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { Button, Input, Typography } from '../../components/ui';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<boolean>;
}

export function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const titleId = useId();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const projectName = name.trim();
    if (!projectName || submitting) return;

    setSubmitting(true);
    const created = await onCreate(projectName);
    setSubmitting(false);

    if (created) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <form
        className="w-full max-w-120 overflow-hidden rounded-none border border-border bg-surface animate-slideIn"
        onSubmit={handleSubmit}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-primary">
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Typography id={titleId} as="h2" variant="heading-sm">
                Create new project
              </Typography>
              <Typography variant="caption" tone="muted">
                Start a new OpenAPI workspace
              </Typography>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close create project dialog"
            onClick={onClose}
            disabled={submitting}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="p-6">
          <Input
            autoFocus
            label="Project name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Customer API"
            helperText="Use a clear name that identifies the API or service."
            maxLength={120}
            disabled={submitting}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-border bg-overlay px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!name.trim()}
          >
            Create project
          </Button>
        </footer>
      </form>
    </div>
  );
}
