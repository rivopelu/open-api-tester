import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface GridPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Grid columns template (Tailwind grid-cols-* or arbitrary). Default: 4-col responsive. */
  columns?: string;
  children?: ReactNode;
}

/**
 * GridPanel — flat seamless grid panel.
 *
 * Technique:
 * - Container: border-left + border-top only (outer frame)
 * - Children (GridCell): border-right + border-bottom on ALL cells
 *   → internal grid lines from cell borders, not from container gap
 * - No container bg-base → empty slots in last row are INVISIBLE
 * - Square-corner, flat design.
 */
export const GridPanel = ({
  columns = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  className,
  children,
  ...props
}: GridPanelProps) => (
  <div
    className={cn(
      'grid border-l border-t border-border',
      columns,
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

/**
 * GridCell — direct child of GridPanel.
 * Adds border-right + border-bottom to form internal grid lines.
 * bg-surface background. No extra wrapper needed.
 */
export const GridCell = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'bg-surface border-r border-b border-border',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);