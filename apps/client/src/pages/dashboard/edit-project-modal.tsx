import { useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '../../components/ui';

interface EditProjectModalProps {
  projectName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function EditProjectModal({ projectName, onClose, onSave }: EditProjectModalProps) {
  const [name, setName] = useState(projectName);
  const [submitting, setSubmitting] = useState(false);
  const trimmedName = name.trim();
  const unchanged = trimmedName === projectName;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedName || unchanged || submitting) return;

    setSubmitting(true);
    try {
      await onSave(trimmedName);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={submitting ? () => undefined : onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader icon={<Pencil className="h-4 w-4" aria-hidden="true" />}>
          <ModalTitle>Rename project</ModalTitle>
          <ModalDescription>Update the name used to identify this API workspace.</ModalDescription>
        </ModalHeader>

        <ModalBody>
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
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={!trimmedName || unchanged}>
            Save changes
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
