import { ArrowRight, CheckSquare, Image, List, Loader, MousePointerClick, SquareSquare, TextCursorInput, Type } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Typography } from '../../components/ui';

const labCards = [
  {
    path: '/lab/button',
    icon: MousePointerClick,
    tone: 'text-primary',
    title: 'Button Atom',
    badge: 'Atom',
    badgeTone: 'text-primary',
    description: 'Primary, secondary, outline, ghost, and danger variants across sizes with loading states and framer-motion tap micro-animations.',
  },
  {
    path: '/lab/card',
    icon: SquareSquare,
    tone: 'text-teal',
    title: 'Card Atom',
    badge: 'Container',
    badgeTone: 'text-teal',
    description: 'Standard, elevated, and featured surfaces with spring hover elevation and quiet borders.',
  },
  {
    path: '/lab/typography',
    icon: Type,
    tone: 'text-purple',
    title: 'Typography Atom',
    badge: 'Type',
    badgeTone: 'text-purple',
    description: 'Sora for hierarchy, Manrope for work, JetBrains Mono for code — with tonal text colors.',
  },
  {
    path: '/lab/checkbox',
    icon: CheckSquare,
    tone: 'text-primary',
    title: 'Checkbox Atom',
    badge: 'Form',
    badgeTone: 'text-purple',
    description: 'Custom check control with peer focus rings, motion feedback, and disabled states.',
  },
  {
    path: '/lab/select',
    icon: List,
    tone: 'text-teal',
    title: 'Select Molecule',
    badge: 'Form',
    badgeTone: 'text-teal',
    description: 'Labeled select control with chevron affordance and focus state matching the input system.',
  },
  {
    path: '/lab/input',
    icon: TextCursorInput,
    tone: 'text-purple',
    title: 'Input Molecule',
    badge: 'Form',
    badgeTone: 'text-primary',
    description: 'Text entry with label, helper, error, mono, and accessibility wiring.',
  },
];

export default function LabIndexPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Typography variant="caption" tone="purple" className="uppercase tracking-widest">Dark Purple Design System</Typography>
        </div>
        <Typography variant="display" as="h1">Interface laboratory</Typography>
        <Typography variant="body" tone="secondary" className="mt-3 max-w-[58ch]">
          The dark-purple foundation for rebuilding the editor with a consistent, accessible component language. Micro-animations via framer-motion.
        </Typography>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {labCards.map((card) => (
          <Link key={card.path} to={card.path}>
            <Card interactive className="flex h-full flex-col justify-between">
              <div>
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-none border border-border bg-overlay ${card.tone}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <Typography variant="heading-md" as="h3">{card.title}</Typography>
                  <Typography variant="caption" tone="secondary" className={`font-bold uppercase tracking-wider ${card.badgeTone}`}>{card.badge}</Typography>
                </div>
                <Typography variant="body-sm" tone="secondary">{card.description}</Typography>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                Open Lab
                <ArrowRight className="h-4 w-4" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <Card variant="featured" interactive={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Typography variant="caption" tone="purple" className="font-bold uppercase tracking-wider">
                Motion Showcase
              </Typography>
              <Typography variant="heading-sm" as="h3" className="mt-1">Framer-motion in practice</Typography>
              <Typography variant="body-sm" tone="secondary" className="mt-2 max-w-xl">
                Staggered reveals, AnimatePresence transitions, layout springs, and tap/whileHover feedback demonstrating how the system moves.
              </Typography>
            </div>
            <Link to="/lab/showcase">
              <ArrowRight className="h-5 w-5 text-primary" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:gap-8">
        <div className="text-center">
          <div className="flex h-12 items-center justify-center">
            <Loader className="h-5 w-5 animate-spin text-primary" />
          </div>
          <Typography variant="caption" tone="muted" className="mt-1 block">Spinner</Typography>
        </div>
        <div className="text-center">
          <div className="flex h-12 items-center justify-center">
            <Image className="h-8 w-8 text-purple" />
          </div>
          <Typography variant="caption" tone="muted" className="mt-1 block">Avatar</Typography>
        </div>
        <Link to="/lab/spinner" className="text-sm font-semibold text-primary">See spinner lab →</Link>
        <Link to="/lab/avatar" className="text-sm font-semibold text-teal">See avatar lab →</Link>
      </div>
    </div>
  );
}