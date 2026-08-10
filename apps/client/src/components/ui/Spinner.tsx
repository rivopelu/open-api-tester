import type { HTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SpinnerProps extends HTMLAttributes<SVGElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return <Loader2 className={cn('animate-spin shrink-0 text-primary', sizeClasses[size], className)} aria-label="Loading" aria-hidden="false" role="status" {...props} />;
}