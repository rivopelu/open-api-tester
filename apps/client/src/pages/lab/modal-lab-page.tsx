import { useState } from 'react';
import { AlertTriangle, FolderPlus, Info } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Modal,
  ModalBody,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Typography,
} from '../../components/ui';

type ExampleModal = 'standard' | 'form' | 'danger' | null;

export default function ModalLabPage() {
  const [example, setExample] = useState<ExampleModal>(null);
  const close = () => setExample(null);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 bg-primary" />
        <Typography variant="heading-lg" as="h1">Modal Component Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2 max-w-[65ch]">
          Reusable dialog composition with focus management, keyboard dismissal, backdrop handling, sizes, and action states.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Examples</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setExample('standard')}>Standard modal</Button>
            <Button variant="secondary" onClick={() => setExample('form')}>Form modal</Button>
            <Button variant="danger" onClick={() => setExample('danger')}>Danger modal</Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Composition</Typography>
        <Card interactive={false}>
          <pre className="overflow-x-auto font-mono text-xs leading-6 text-text-secondary">{`<Modal open={open} onClose={close}>
  <ModalHeader icon={<Icon />}>
    <ModalTitle>Title</ModalTitle>
    <ModalDescription>Supporting context</ModalDescription>
  </ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>Actions</ModalFooter>
</Modal>`}</pre>
        </Card>
      </section>

      <Modal open={example === 'standard'} onClose={close} size="sm">
        <ModalHeader icon={<Info className="h-4 w-4" />}>
          <ModalTitle>Standard modal</ModalTitle>
          <ModalDescription>Use for focused information and short decisions.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <Typography variant="body-sm" tone="secondary">
            The modal traps keyboard focus, restores focus when closed, locks body scroll, and supports Escape or backdrop dismissal.
          </Typography>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={close}>Got it</Button>
        </ModalFooter>
      </Modal>

      <Modal open={example === 'form'} onClose={close}>
        <form onSubmit={(event) => { event.preventDefault(); close(); }}>
          <ModalHeader icon={<FolderPlus className="h-4 w-4" />}>
            <ModalTitle>Create folder</ModalTitle>
            <ModalDescription>Organize requests inside a nested folder.</ModalDescription>
          </ModalHeader>
          <ModalBody>
            <Input autoFocus label="Folder name" placeholder="e.g. Authentication" helperText="Use a short, recognizable name." />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit">Create folder</Button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal open={example === 'danger'} onClose={close} closeOnBackdrop={false}>
        <ModalHeader icon={<AlertTriangle className="h-4 w-4" />} tone="danger">
          <ModalTitle>Delete folder</ModalTitle>
          <ModalDescription>This action cannot be undone.</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <Typography variant="body-sm" tone="secondary">
            Delete <strong className="text-text-primary">Authentication</strong>? The folder must be empty before deletion.
          </Typography>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="danger" onClick={close}>Delete folder</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
