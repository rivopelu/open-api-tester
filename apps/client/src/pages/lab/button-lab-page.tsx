import { useState } from 'react';
import { Download, Send, Trash2, ArrowRight } from 'lucide-react';
import { Button, Card, Typography } from '../../components/ui';

export default function ButtonLabPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-md bg-primary" />
        <Typography variant="heading-lg" as="h1">Button Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Variants, sizes, loading states, and icon-only buttons with framer-motion tap feedback.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Loading Toggle</Typography>
        <Card interactive={false} padding="sm">
          <div className="flex items-center justify-between gap-4">
            <Typography variant="body-sm" tone="secondary">Propagates to every button below</Typography>
            <Button variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
              {loading ? 'Loading ON' : 'Loading OFF'}
            </Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Variants</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading={loading}>Primary</Button>
            <Button variant="secondary" loading={loading}>Secondary</Button>
            <Button variant="outline" loading={loading}>Outline</Button>
            <Button variant="ghost" loading={loading}>Ghost</Button>
            <Button variant="danger" loading={loading}>Delete</Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Sizes</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" loading={loading}>Small</Button>
            <Button size="md" loading={loading}>Medium</Button>
            <Button size="lg" loading={loading} className="gap-2">
              Large action
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Icon-only Buttons</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm" iconOnly loading={loading} aria-label="Download"><Download className="h-4 w-4" /></Button>
            <Button variant="outline" size="md" iconOnly loading={loading} aria-label="Send"><Send className="h-4 w-4" /></Button>
            <Button variant="danger" size="lg" iconOnly loading={loading} aria-label="Delete"><Trash2 className="h-5 w-5" /></Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Disabled</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Primary</Button>
            <Button variant="outline" disabled>Outline</Button>
            <Button variant="ghost" disabled>Ghost</Button>
          </div>
        </Card>
      </section>
    </div>
  );
}