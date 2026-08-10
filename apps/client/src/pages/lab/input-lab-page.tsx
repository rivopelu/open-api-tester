import { useState } from 'react';
import { KeyRound, Link2, X } from 'lucide-react';
import { Input, Card, Typography } from '../../components/ui';

export default function InputLabPage() {
  const [name, setName] = useState('listWorkspaces');
  const [token, setToken] = useState('sk_live_••••••••');

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-none bg-purple" />
        <Typography variant="heading-lg" as="h1">Input Molecule Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Labels stay close to their control. Leading/trailing icons, clearable values, sizes, and error states.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Variants</Typography>
        <Card interactive={false} className="max-w-md space-y-6">
          <Input label="Endpoint name" placeholder="List workspaces" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Request path" defaultValue="/v1/workspaces" mono helperText="Path parameters use {braces}." />
          <Input label="Operation ID" defaultValue="listWorkspaces" error="Operation ID is already used." />
          <Input label="Disabled" disabled value="read-only value" />
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Icons & clearable</Typography>
        <Card interactive={false} className="max-w-md space-y-6">
          <Input
            label="Base URL"
            placeholder="https://api.example.com"
            leadingIcon={<Link2 className="h-4 w-4" />}
          />
          <Input
            label="API token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            leadingIcon={<KeyRound className="h-4 w-4" />}
            showClear
            onClear={() => setToken('')}
            mono
            helperText="Clears via the trailing icon."
          />
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Sizes</Typography>
        <Card interactive={false} className="max-w-md space-y-5">
          <Input size="sm" label="Small" placeholder="Small input" />
          <Input size="md" label="Medium" placeholder="Medium input" />
          <Input size="lg" label="Large" placeholder="Large input" />
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Live state</Typography>
        <Card interactive={false}>
          <pre className="overflow-auto rounded-none border border-border bg-overlay p-4 font-mono text-xs text-purple">
{`endpoint name = "${name}"
token         = "${token}"`}
          </pre>
          <Typography variant="caption" tone="muted" className="mt-3 inline-flex items-center gap-1.5">
            <X className="h-3.5 w-3.5" /> Token field is clearable — click the icon.
          </Typography>
        </Card>
      </section>
    </div>
  );
}