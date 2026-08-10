import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Typography } from './Typography';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, id, className, ...props }, ref) => {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <motion.label
      htmlFor={checkboxId}
      whileTap={{ scale: 0.98 }}
      className={cn('inline-flex items-center gap-2.5 cursor-pointer select-none', className)}
    >
      <input ref={ref} id={checkboxId} type="checkbox" className="peer sr-only" {...props} />
      <span
        aria-hidden="true"
        className={cn(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-none border bg-overlay transition-all duration-200',
          'border-border peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary/20',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        )}
      >
        <svg
          viewBox="0 0 12 10"
          className={cn('h-2.5 w-2.5 text-base transition-transform duration-200', props.checked ? 'scale-100' : 'scale-0')}
          fill="none"
        >
          <path d="M1 5.2L4.2 8.4L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {label && <Typography variant="body-sm" tone="secondary">{label}</Typography>}
    </motion.label>
  );
});

Checkbox.displayName = 'Checkbox';