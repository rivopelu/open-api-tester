import { useState } from 'react';
import { Bot, User } from 'lucide-react';
import { Avatar, Card, Typography } from '../../components/ui';

export default function AvatarLabPage() {
  const [src, setSrc] = useState<string | null>('https://invalid-image-url.xyz/pic.jpg');

  const initials = [
    { alt: 'Rivo Pelu', tone: '' },
    { alt: 'Studio Bot', tone: 'text-teal' },
    { alt: 'Sarah Kim', tone: 'text-primary' },
  ] as const;

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-none bg-primary" />
        <Typography variant="heading-lg" as="h1">Avatar Atom Lab</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Image and initials fallback avatars with error recovery.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Sizes</Typography>
        <Card interactive={false}>
          <div className="flex items-end gap-8">
            <div className="text-center">
              <Avatar size="sm" alt="Small" />
              <Typography variant="caption" tone="muted" className="mt-2 block">Small (sm)</Typography>
            </div>
            <div className="text-center">
              <Avatar size="md" alt="Medium" />
              <Typography variant="caption" tone="muted" className="mt-2 block">Medium (md)</Typography>
            </div>
            <div className="text-center">
              <Avatar size="lg" alt="Large" />
              <Typography variant="caption" tone="muted" className="mt-2 block">Large (lg)</Typography>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Initials fallback</Typography>
        <Card interactive={false}>
          <div className="flex items-center gap-3">
            {initials.map(({ alt, tone }) => (
              <Avatar key={alt} alt={alt} size="lg" className={tone} />
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Custom element fallback</Typography>
        <Card interactive={false}>
          <div className="flex items-center gap-3">
            <Avatar size="lg" fallback={<Bot className="h-6 w-6" />} className="bg-primary/15 text-primary" alt="AI agent" />
            <Avatar size="lg" fallback={<User className="h-6 w-6" />} className="bg-purple/15 text-purple" alt="User" />
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Broken image recovery</Typography>
        <Card interactive={false}>
          <div className="flex items-center gap-4">
            <Avatar src={src} alt="Failed image" size="lg" />
            <button
              onClick={() => setSrc((s) => (s ? null : 'https://invalid-image-url.xyz/pic.jpg'))}
              className="cursor-pointer rounded-none border border-primary/60 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              {src ? 'Break image URL' : 'Restore broken URL'}
            </button>
          </div>
        </Card>
      </section>
    </div>
  );
}