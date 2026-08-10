import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface PopoverApi {
  open: boolean;
  close: () => void;
}

export interface PopoverProps {
  /** Trigger rendered next to the panel. Either a node or a render-prop. */
  trigger: ReactNode | ((api: PopoverApi) => ReactNode);
  /** Panel content. Either a node or a render-prop (to close after an action). */
  children: ReactNode | ((api: PopoverApi) => ReactNode);
  /** Align the panel to the start (left) or end (right) of the trigger. */
  align?: 'start' | 'end';
  /** Extra classes for the panel. */
  className?: string;
  /** Extra classes for the wrapper around the trigger. */
  triggerClassName?: string;
}

/**
 * Lightweight popover that closes on outside click or Escape. Panel appears
 * below the trigger (bottom-start/end). Used for menus, dropdowns, and any
 * floating UI anchored to a control.
 */
export function Popover({
  trigger,
  children,
  align = 'end',
  className,
  triggerClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => setOpen((o) => !o);
  const api: PopoverApi = { open, close: () => setOpen(false) };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <div
        className={cn('inline-flex', triggerClassName)}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {typeof trigger === 'function' ? trigger(api) : trigger}
      </div>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-[150] mt-2 min-w-[220px] rounded-lg border border-border bg-surface p-1.5',
            'shadow-[0_18px_50px_rgba(0,0,0,0.5)] animate-slideIn',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {typeof children === 'function' ? children(api) : children}
        </div>
      )}
    </div>
  );
}