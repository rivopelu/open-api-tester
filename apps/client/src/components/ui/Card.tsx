import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'standard' | 'elevated' | 'featured';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children?: React.ReactNode;
}

const variantClasses = {
  standard:
    'bg-surface border border-border text-text-primary shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
  elevated:
    'bg-card border border-border text-text-primary shadow-[0_10px_32px_rgba(0,0,0,0.35)]',
  featured:
    'bg-surface text-text-primary border border-primary/30 shadow-[inset_0_0_0_1px_rgba(137,180,250,0.12),0_4px_20px_rgba(0,0,0,0.3)]',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'standard', padding = 'md', interactive = false, className, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      whileHover={
        interactive
          ? { y: -3, boxShadow: '0 14px 34px rgba(0,0,0,0.4)' }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'rounded-lg transition-colors duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        interactive && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  ),
);

Card.displayName = 'Card';