import { useState } from 'react';
import { Cloud, Search } from 'lucide-react';
import { Select, Card, Typography } from '../../components/ui';

export default function SelectLabPage() {
  const [environment, setEnvironment] = useState('');
  const [region, setRegion] = useState('ap-southeast-1');
  const [operator, setOperator] = useState('');

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-md bg-teal" />
        <Typography variant="heading-lg" as="h1">Select Molecule Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Professional searchable select with animated dropdown, keyboard navigation, and clearable state.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Searchable & sizes</Typography>
        <Card interactive={false} className="max-w-md space-y-6">
          <Select
            label="Environment"
            placeholder="Choose environment…"
            value={environment}
            onChange={setEnvironment}
            options={[
              { label: 'Development', value: 'development', description: 'local hot-reload' },
              { label: 'Staging', value: 'staging', description: 'shared preview' },
              { label: 'Production', value: 'production', description: 'customer traffic' },
            ]}
          />
          <Select
            size="sm"
            label="Small select"
            placeholder="Pick an operator…"
            value={operator}
            onChange={setOperator}
            options={[
              { label: 'equals', value: 'eq' },
              { label: 'not equals', value: 'neq' },
              { label: 'contains', value: 'contains' },
              { label: 'starts with', value: 'startsWith' },
            ]}
          />
          <Select
            size="lg"
            label="Large select"
            value={region}
            onChange={setRegion}
            options={[
              { label: 'ap-southeast-1', value: 'ap-southeast-1', description: 'Singapore' },
              { label: 'us-east-1', value: 'us-east-1', description: 'N. Virginia' },
              { label: 'eu-west-1', value: 'eu-west-1', description: 'Ireland' },
            ]}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">States</Typography>
        <Card interactive={false} className="max-w-md space-y-6">
          <Select
            label="Clearable + error"
            placeholder="Required field…"
            value={environment}
            onChange={setEnvironment}
            clearable
            error="Environment is required."
            options={[
              { label: 'Development', value: 'development' },
              { label: 'Production', value: 'production' },
            ]}
          />
          <Select
            label="Disabled"
            disabled
            value="production"
            options={[{ label: 'Production', value: 'production' }]}
          />
          <Select
            label="With icons"
            placeholder="Cloud provider…"
            value={region}
            onChange={setRegion}
            options={[
              { label: 'AWS', value: 'aws', icon: <Cloud className="h-4 w-4" />, description: 'ap-southeast-1' },
              { label: 'Vercel', value: 'vercel', icon: <Cloud className="h-4 w-4" />, description: 'edge network' },
            ]}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Live state</Typography>
        <Card interactive={false}>
          <pre className="overflow-auto rounded-lg border border-border bg-overlay p-4 font-mono text-xs text-teal">
{`environment = ${environment ? `"${environment}"` : '"" (placeholder)'}
region      = "${region}"
operator    = ${operator ? `"${operator}"` : '"" (placeholder)'}`}
          </pre>
          <Typography variant="caption" tone="muted" className="mt-3 inline-flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" /> Search box filters options — try typing &quot;prod&quot;.
          </Typography>
        </Card>
      </section>
    </div>
  );
}