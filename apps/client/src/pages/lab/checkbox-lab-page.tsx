import { useState } from 'react';
import { Checkbox, Card, Typography } from '../../components/ui';

export default function CheckboxLabPage() {
  const [rememberMe, setRememberMe] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [custom, setCustom] = useState(false);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-none bg-primary" />
        <Typography variant="heading-lg" as="h1">Checkbox Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Custom check control with peer focus rings and motion feedback.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Interactive Checkboxes</Typography>
        <Card interactive={false}>
          <div className="space-y-3">
            <Checkbox
              label={`Remember me (${rememberMe ? 'TRUE' : 'FALSE'})`}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <Checkbox
              label={`Subscribe to newsletter (${newsletter ? 'TRUE' : 'FALSE'})`}
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">States & Configuration</Typography>
        <Card interactive={false}>
          <Typography variant="body-sm" tone="secondary" className="mb-3">Disabled states</Typography>
          <div className="space-y-2">
            <Checkbox label="Disabled unchecked" disabled checked={false} />
            <Checkbox label="Disabled checked" disabled checked />
          </div>
          <div className="mt-4 border-t border-border/70 pt-4">
            <Typography variant="body-sm" tone="secondary" className="mb-3">Custom styling override</Typography>
            <Checkbox
              label="Purple-tinted highlight via className"
              checked={custom}
              onChange={(e) => setCustom(e.target.checked)}
              className="rounded-none bg-purple/10 px-3 py-2"
            />
          </div>
        </Card>
      </section>
    </div>
  );
}