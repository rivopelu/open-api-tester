import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckSquare,
  Image,
  List,
  Loader,
  MousePointerClick,
  Sparkles,
  SquareSquare,
  TestTube,
  Type,
  TextCursorInput,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Typography } from '../../components/ui';

const labNavItems = [
  { path: '/lab', label: 'Overview', icon: TestTube },
  { path: '/lab/button', label: 'Button Atom', icon: MousePointerClick },
  { path: '/lab/card', label: 'Card Atom', icon: SquareSquare },
  { path: '/lab/typography', label: 'Typography Atom', icon: Type },
  { path: '/lab/checkbox', label: 'Checkbox Atom', icon: CheckSquare },
  { path: '/lab/select', label: 'Select Molecule', icon: List },
  { path: '/lab/input', label: 'Input Molecule', icon: TextCursorInput },
  { path: '/lab/avatar', label: 'Avatar Atom', icon: Image },
  { path: '/lab/spinner', label: 'Spinner Atom', icon: Loader },
  { path: '/lab/showcase', label: 'Motion Showcase', icon: Sparkles },
];

export default function LabLayout() {
  return (
    <div className="flex h-screen flex-col font-body bg-base text-text-primary md:flex-row">
      <aside className="flex w-full shrink-0 flex-col justify-between border-r border-border bg-surface p-6 md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto">
        <div>
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="group flex items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Back to Studio
            </Link>
          </div>

          <div className="mb-8 flex flex-col gap-0.5 pb-6 border-b border-border-subtle">
            <h2 className="font-heading text-base font-bold text-text-primary">Component Lab</h2>
            <Typography variant="caption" tone="purple" className="uppercase tracking-widest leading-none">Dark Purple System</Typography>
          </div>

          <nav className="space-y-1">
            {labNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/lab'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-none px-3.5 py-2.5 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-primary text-base'
                      : 'text-text-secondary hover:bg-overlay hover:text-text-primary',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-border-subtle pt-6">
          <div className="rounded-none bg-card p-4 text-text-primary">
            <span className="font-heading mb-1 block text-xs font-semibold uppercase tracking-wider text-purple">
              System V1
            </span>
            <p className="text-xs text-text-muted">
              Sora headlines, Manrope body. Primary{' '}
              <code className="rounded-none bg-overlay px-1 py-0.5 font-mono text-primary">#89B4FA</code>.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}