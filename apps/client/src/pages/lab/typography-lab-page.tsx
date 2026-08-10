import { useState } from 'react';
import { Button, Card, Typography, type TypographyTone, type TypographyVariant } from '../../components/ui';

const variants: TypographyVariant[] = ['display', 'heading-lg', 'heading-md', 'heading-sm', 'body', 'body-sm', 'label', 'caption', 'code'];

const tones: TypographyTone[] = ['default', 'secondary', 'muted', 'primary', 'purple', 'teal', 'success', 'warning', 'danger'];

const tags = ['h1', 'h2', 'h3', 'h4', 'p', 'span', 'label', 'code'];

export default function TypographyLabPage() {
  const [text, setText] = useState('Reliable structure for complex work');
  const [variant, setVariant] = useState<TypographyVariant>('heading-lg');
  const [tone, setTone] = useState<TypographyTone>('default');
  const [tag, setTag] = useState<string>('h2');

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-none bg-purple" />
        <Typography variant="heading-lg" as="h1">Typography Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Sora for hierarchy, Manrope for work, JetBrains Mono for code.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Interactive Sandbox</Typography>
        <Card interactive={false} padding="lg">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5 md:col-span-1">
              <Typography as="label" htmlFor="typography-text" variant="label">Text content</Typography>
              <input
                id="typography-text"
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-10 rounded-none border border-border bg-overlay px-3 text-sm font-semibold text-text-primary outline-none transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Typography as="label" htmlFor="typography-variant" variant="label">Variant</Typography>
              <select
                id="typography-variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value as TypographyVariant)}
                className="h-10 cursor-pointer appearance-none rounded-none border border-border bg-overlay px-3 text-sm font-semibold text-text-primary outline-none transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/15"
              >
                {variants.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Typography as="label" htmlFor="typography-tone" variant="label">Tone</Typography>
              <select
                id="typography-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value as TypographyTone)}
                className="h-10 cursor-pointer appearance-none rounded-none border border-border bg-overlay px-3 text-sm font-semibold text-text-primary outline-none transition-all focus:border-primary focus:ring-[3px] focus:ring-primary/15"
              >
                {tones.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
            <Typography variant="caption" tone="secondary">HTML tag:</Typography>
            {tags.map((t) => (
              <Button
                key={t}
                variant={tag === t ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setTag(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          <div className="mt-6 flex min-h-28 items-center justify-center overflow-auto rounded-none border border-border/60 bg-overlay/60 p-6">
            <Typography variant={variant} tone={tone} as={tag as never} className="text-center">
              {text || 'Type something…'}
            </Typography>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">System Showcase</Typography>
        <Card interactive={false}>
          <div className="divide-y divide-border/60">
            {variants.map((v) => (
              <div key={v} className="grid items-center gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Typography variant="caption" tone="primary" className="font-bold">{v}</Typography>
                  <Typography variant="caption" tone="muted">
                    {v === 'code' ? 'font-mono' : ['display', 'heading-lg', 'heading-md', 'heading-sm'].includes(v) ? 'font-sora' : 'font-manrope'}
                  </Typography>
                </div>
                <div className="md:col-span-2">
                  <Typography variant={v} tone="default">
                    {v === 'label' || v === 'caption' || v === 'code' ? 'LABEL / CODE SAMPLE — 0123456789' : 'The quick brown fox jumps over the lazy dog.'}
                  </Typography>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}