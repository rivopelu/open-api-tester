import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'elevated' | 'featured';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children?: React.ReactNode;
}

const variantClasses = {
  standard:
    'bg-surface border border-border text-text-primary',
  elevated:
    'bg-card border border-border text-text-primary',
  featured:
    'bg-surface text-text-primary border border-primary/30',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'standard', padding = 'md', interactive = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-none transition-colors duration-200',
        variantClasses[variant],
        paddingClasses[padding],
        interactive && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';
