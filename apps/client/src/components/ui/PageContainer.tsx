import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PageSize = 'sm' | 'md' | 'lg' | 'fluid';

const sizeClasses: Record<PageSize, string> = {
  sm: 'max-w-160',
  md: 'max-w-215',
  lg: 'max-w-300',
  fluid: 'max-w-none',
};

export interface PageContainerProps {
  /** Constrain content width. Defaults to fluid (fills the main area). */
  size?: PageSize;
  className?: string;
  children: ReactNode;
}

/**
 * Scrollable, padded wrapper that every page renders inside. Keeps page
 * layout consistent (spacing, scroll, entrance animation) regardless of the
 * host shell (mirrors the container/page split in biwave/fe-biwave).
 */
export function PageContainer({
  size = 'fluid',
  className,
  children,
}: PageContainerProps) {
  return (
    <section
      className={cn(
        'scroll-y mx-auto min-h-0 w-full flex-1 animate-fadeIn px-6 py-6',
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </section>
  );
}