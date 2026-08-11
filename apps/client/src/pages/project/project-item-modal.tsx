import { useState, type FormEvent } from 'react';
import { FilePlus2, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Typography,
} from '../../components/ui';

export type ProjectItemDialogState =
  | { type: 'create-endpoint'; folderId: string | null }
  | { type: 'create-folder'; parentId: string | null }
  | { type: 'rename-folder'; folderId: string; currentName: string }
  | { type: 'delete-folder'; folderId: string; currentName: string }
  | { type: 'rename-endpoint'; endpointId: string; currentName: string };

interface ProjectItemModalProps {
  dialog: ProjectItemDialogState;
  onClose: () => void;
  onSubmit: (value?: string) => Promise<void>;
}

const dialogContent = {
  'create-endpoint': {
    title: 'Create request',
    description: 'Add a new API request to this location.',
    label: 'Request name',
    placeholder: 'e.g. Get customers',
    submitLabel: 'Create request',
    initialValue: 'New Request',
    icon: FilePlus2,
  },
  'create-folder': {
    title: 'Create folder',
    description: 'Organize requests inside a nested folder.',
    label: 'Folder name',
    placeholder: 'e.g. Authentication',
    submitLabel: 'Create folder',
    initialValue: 'New Folder',
    icon: FolderPlus,
  },
  'rename-folder': {
    title: 'Rename folder',
    description: 'Change the name shown in the request tree.',
    label: 'Folder name',
    placeholder: 'Folder name',
    submitLabel: 'Save changes',
    initialValue: '',
    icon: Pencil,
  },
  'rename-endpoint': {
    title: 'Rename request',
    description: 'Change the request name shown in the sidebar.',
    label: 'Request name',
    placeholder: 'Request name',
    submitLabel: 'Save changes',
    initialValue: '',
    icon: Pencil,
  },
} as const;

export function ProjectItemModal({ dialog, onClose, onSubmit }: ProjectItemModalProps) {
  const isDelete = dialog.type === 'delete-folder';
  const config = isDelete ? dialogContent['create-folder'] : dialogContent[dialog.type];
  const currentName = 'currentName' in dialog ? dialog.currentName : '';
  const [value, setValue] = useState(currentName || config?.initialValue || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = value.trim();
    if ((!isDelete && !nextValue) || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(isDelete ? undefined : nextValue);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete this action.');
      setSubmitting(false);
    }
  };

  const Icon = isDelete ? Trash2 : config.icon;

  return (
    <Modal open onClose={onClose} closeOnBackdrop={!submitting} closeOnEscape={!submitting}>
      <form onSubmit={submit}>
        <ModalHeader icon={<Icon className="h-4 w-4" />} tone={isDelete ? 'danger' : 'primary'}>
          <ModalTitle>{isDelete ? 'Delete folder' : config.title}</ModalTitle>
          <ModalDescription>
            {isDelete ? 'This action cannot be undone.' : config.description}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          {isDelete ? (
            <Typography variant="body-sm" tone="secondary">
              Delete <strong className="text-text-primary">{dialog.currentName}</strong>? The folder must be empty before it can be deleted.
            </Typography>
          ) : (
            <Input
              autoFocus
              label={config.label}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={config.placeholder}
              maxLength={120}
              disabled={submitting}
              error={error ?? undefined}
            />
          )}
          {isDelete && error && <Typography className="mt-3" variant="caption" tone="danger">{error}</Typography>}
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            type="submit"
            variant={isDelete ? 'danger' : 'primary'}
            loading={submitting}
            disabled={!isDelete && !value.trim()}
          >
            {isDelete ? 'Delete folder' : config.submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
