import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Button, Card, Typography } from '../../components/ui';

const spring = { type: 'spring', stiffness: 380, damping: 26 } as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
} as const;

const items = [
  { id: 1, label: 'GET', tone: 'text-success' },
  { id: 2, label: 'POST', tone: 'text-primary' },
  { id: 3, label: 'PUT', tone: 'text-warning' },
  { id: 4, label: 'PATCH', tone: 'text-orange' },
  { id: 5, label: 'DELETE', tone: 'text-danger' },
];

export default function ShowcaseLabPage() {
  const [visible, setVisible] = useState(false);
  const [sequence, setSequence] = useState(items);

  const remove = (id: number) => {
    setSequence((seq) => seq.filter((i) => i.id !== id));
  };

  const reset = () => setSequence(items);

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <div className="mb-3 h-1 w-10 rounded-none bg-purple" />
        <Typography variant="heading-lg" as="h1">Motion Showcase</Typography>
        <Typography variant="body" tone="secondary" className="mt-2">
          Framer-motion patterns used across the system: staggered reveals, mounted transitions, and layout reflow.
        </Typography>
      </div>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Staggered entry</Typography>
        <Card interactive={false}>
          <div className="mb-6 flex items-center justify-between">
            <Typography variant="body-sm" tone="secondary">Variants stagger each child by 40ms</Typography>
            <Button size="sm" variant={visible ? 'outline' : 'primary'} onClick={() => setVisible((v) => !v)}>
              {visible ? 'Hide' : 'Reveal'}
            </Button>
          </div>
          <AnimatePresence mode="wait">
            {visible && (
              <motion.div
                key="stagger"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    transition={spring}
                    className="flex h-16 items-center justify-center rounded-none border border-border bg-overlay font-mono text-xs text-text-secondary"
                  >
                    request-0{i + 1}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Mount transition</Typography>
        <Card interactive={false}>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...spring, delayChildren: 0.1 }}
            className="rounded-none bg-card p-5"
          >
            <Typography variant="heading-sm" as="h3" className="mb-1">Card enters on mount</Typography>
            <Typography variant="body-sm" tone="secondary">
              Opacity + translate + subtle scale settle with a spring.
            </Typography>
          </motion.div>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Layout reflow</Typography>
        <Card interactive={false}>
          <div className="mb-6 flex items-center justify-between">
            <Typography variant="body-sm" tone="secondary">Remove items; survivors animate into place</Typography>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={reset}>Reset</Button>
            </div>
          </div>
          <AnimatePresence>
            {sequence.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={spring}
                className="mb-2 flex items-center justify-between rounded-none border border-border bg-overlay px-4 py-3"
              >
                <span className={`font-mono text-xs font-bold ${item.tone}`}>{item.label}</span>
                <button
                  onClick={() => remove(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="cursor-pointer rounded-none p-1 text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
            {sequence.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center text-sm text-text-muted"
              >
                All method chips removed — reset to bring them back.
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </section>

      <section className="space-y-4">
        <Typography variant="heading-sm" as="h2">Micro-interaction</Typography>
        <Card interactive={false}>
          <div className="flex flex-wrap items-center gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.button
                key={i}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.94 }}
                transition={spring}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-none border border-border bg-card text-text-secondary hover:border-primary/50 hover:text-primary"
                aria-label={`Interaction ${i + 1}`}
              >
                {i + 1}
              </motion.button>
            ))}
            <motion.div whileTap={{ rotate: 45 }} transition={spring} className="grid h-14 w-14 cursor-pointer place-items-center rounded-none bg-primary text-base">
              <Plus className="h-6 w-6" />
            </motion.div>
          </div>
        </Card>
      </section>
    </div>
  );
}