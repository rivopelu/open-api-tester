import { Spinner, Card, Typography } from '../../components/ui';

export default function SpinnerLabPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-md bg-primary" />
        <Typography variant="heading-lg" as="h1">Spinner Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Lucide Loader2 with a standard spin animation and size token map.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Sizes</Typography>
        <Card interactive={false}>
          <div className="flex items-center gap-10">
            <div className="text-center">
              <div className="flex h-12 items-center justify-center"><Spinner size="sm" /></div>
              <Typography variant="caption" tone="muted" className="mt-2 block">Small (sm)</Typography>
            </div>
            <div className="text-center">
              <div className="flex h-12 items-center justify-center"><Spinner size="md" /></div>
              <Typography variant="caption" tone="muted" className="mt-2 block">Medium (md)</Typography>
            </div>
            <div className="text-center">
              <div className="flex h-12 items-center justify-center"><Spinner size="lg" /></div>
              <Typography variant="caption" tone="muted" className="mt-2 block">Large (lg)</Typography>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Color variants</Typography>
        <Card interactive={false}>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <Spinner className="text-primary" />
              <Typography variant="caption" tone="muted" className="mt-1 block">Primary</Typography>
            </div>
            <div className="text-center">
              <Spinner className="text-purple" />
              <Typography variant="caption" tone="muted" className="mt-1 block">Purple</Typography>
            </div>
            <div className="text-center">
              <Spinner className="text-teal" />
              <Typography variant="caption" tone="muted" className="mt-1 block">Teal</Typography>
            </div>
            <div className="text-center">
              <Spinner className="text-text-muted" />
              <Typography variant="caption" tone="muted" className="mt-1 block">Muted</Typography>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">In context</Typography>
        <Card interactive={false}>
          <div className="flex items-center justify-between rounded-lg bg-card px-5 py-4">
            <Typography variant="body-sm" tone="secondary">Synchronizing workspace…</Typography>
            <Spinner size="sm" />
          </div>
        </Card>
      </section>
    </div>
  );
}