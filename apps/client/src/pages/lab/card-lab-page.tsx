import { ArrowRight, Bot, ShieldCheck, Zap } from 'lucide-react';
import { Button, Card, Typography } from '../../components/ui';

export default function CardLabPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-md bg-teal" />
        <Typography variant="heading-lg" as="h1">Card Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Standard, elevated, and featured surfaces with spring hover elevation.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Standard & Elevated</Typography>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card interactive>
            <Typography variant="heading-sm" as="h3" className="mb-2">Interactive Card</Typography>
            <Typography variant="body-sm" tone="secondary" className="mb-4">
              Surface #1E1E2E, quiet border, rises on hover with a spring translation.
            </Typography>
            <span className="flex items-center gap-2 text-xs font-semibold text-primary">
              Learn more <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Card>
          <Card interactive={false}>
            <Typography variant="heading-sm" as="h3" className="mb-2">Static Card</Typography>
            <Typography variant="body-sm" tone="secondary">
              No hover elevation, no cursor pointer. For fixed containers or display-only blocks.
            </Typography>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Featured Surface</Typography>
        <Card variant="featured" interactive>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography variant="caption" tone="primary" className="font-bold uppercase tracking-wider">Featured highlight</Typography>
              <Typography variant="heading-sm" as="h3" className="my-2">One important block</Typography>
              <Typography variant="body-sm" tone="secondary" className="max-w-xl">
                Blue-tinted inset ring reserved for a single hero surface — not every block.
              </Typography>
            </div>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-overlay text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
            <Typography variant="caption" tone="muted">System V1</Typography>
            <Button size="sm">Get started</Button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Service Cards</Typography>
        <div className="grid gap-5 sm:grid-cols-2">
          <Card interactive>
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-border bg-overlay text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <Typography variant="heading-sm" as="h3" className="mb-2">Autonomous Agent Core</Typography>
            <Typography variant="body-sm" tone="secondary">
              Engineered for seamless integration with AI tool calls and dynamic rendering logic.
            </Typography>
          </Card>
          <Card interactive>
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-border bg-overlay text-teal">
              <Zap className="h-5 w-5" />
            </div>
            <Typography variant="heading-sm" as="h3" className="mb-2">Real-time Intelligence</Typography>
            <Typography variant="body-sm" tone="secondary">
              Ultra low-latency event processing and live execution monitoring dashboard.
            </Typography>
          </Card>
        </div>
      </section>
    </div>
  );
}