import { forwardRef, type AllHTMLAttributes, type ElementType } from 'react';
import { cn } from '../../lib/utils';

export type TypographyVariant = 'display' | 'heading-lg' | 'heading-md' | 'heading-sm' | 'body' | 'body-sm' | 'label' | 'caption' | 'code';
export type TypographyTone = 'default' | 'secondary' | 'muted' | 'primary' | 'purple' | 'teal' | 'success' | 'warning' | 'danger';

export interface TypographyProps extends Omit<AllHTMLAttributes<HTMLElement>, 'as'> {
  variant?: TypographyVariant;
  tone?: TypographyTone;
  as?: ElementType;
}

const defaultTags: Record<TypographyVariant, ElementType> = {
  display: 'h1',
  'heading-lg': 'h2',
  'heading-md': 'h3',
  'heading-sm': 'h4',
  body: 'p',
  'body-sm': 'p',
  label: 'span',
  caption: 'span',
  code: 'code',
};

const variantClasses: Record<TypographyVariant, string> = {
  display: 'font-heading max-w-[15ch] text-4xl sm:text-5xl md:text-[clamp(36px,5vw,62px)] font-bold leading-[1.02] tracking-tight',
  'heading-lg': 'font-heading text-2xl sm:text-3xl font-bold leading-[1.18] tracking-tight',
  'heading-md': 'font-heading text-xl font-semibold leading-[1.3] tracking-tight',
  'heading-sm': 'font-heading text-base font-semibold leading-[1.4] tracking-tight',
  body: 'font-body text-sm leading-[1.65]',
  'body-sm': 'font-body text-[13px] leading-[1.55]',
  label: 'font-body text-xs font-bold leading-[1.4]',
  caption: 'font-body text-[11px] leading-[1.45]',
  code: 'font-mono text-xs leading-[1.55]',
};

const toneClasses: Record<TypographyTone, string> = {
  default: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  primary: 'text-primary',
  purple: 'text-purple',
  teal: 'text-teal',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ variant = 'body', tone = 'default', as, className, ...props }, ref) => {
    const Component = (as ?? defaultTags[variant]) as ElementType;
    return <Component ref={ref} className={cn(variantClasses[variant], toneClasses[tone], className)} {...props} />;
  },
);

Typography.displayName = 'Typography';