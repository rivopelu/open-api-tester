import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { Typography } from './Typography';

interface ModalContextValue {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('Modal components must be rendered inside Modal');
  return context;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
};

export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        '[autofocus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose();
  };

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
      onMouseDown={closeFromBackdrop}
    >
      <ModalContext.Provider value={{ titleId, descriptionId, onClose }}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            'w-full overflow-hidden border border-border bg-surface text-text-primary animate-slideIn',
            sizeClasses[size],
            className,
          )}
        >
          {children}
        </div>
      </ModalContext.Provider>
    </div>,
    document.body,
  );
}

export interface ModalHeaderProps extends HTMLAttributes<HTMLElement> {
  icon?: ReactNode;
  tone?: 'primary' | 'danger';
  closeLabel?: string;
}

export const ModalHeader = forwardRef<HTMLElement, ModalHeaderProps>(
  ({ icon, tone = 'primary', closeLabel = 'Close dialog', className, children, ...props }, ref) => {
    const { onClose } = useModalContext();
    return (
      <header ref={ref} className={cn('flex items-start justify-between gap-4 border-b border-border px-6 py-4', className)} {...props}>
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className={cn(
              'grid h-9 w-9 shrink-0 place-items-center',
              tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary',
            )}>
              {icon}
            </span>
          )}
          <div className="min-w-0">{children}</div>
        </div>
        <Button type="button" variant="ghost" size="sm" iconOnly aria-label={closeLabel} onClick={onClose}>
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>
    );
  },
);
ModalHeader.displayName = 'ModalHeader';

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement>;

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(({ className, ...props }, ref) => {
  const { titleId } = useModalContext();
  return <Typography ref={ref} id={titleId} as="h2" variant="heading-sm" className={className} {...props} />;
});
ModalTitle.displayName = 'ModalTitle';

export type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(({ className, ...props }, ref) => {
  const { descriptionId } = useModalContext();
  return <Typography ref={ref} id={descriptionId} variant="caption" tone="muted" className={className} {...props} />;
});
ModalDescription.displayName = 'ModalDescription';

export const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6', className)} {...props} />,
);
ModalBody.displayName = 'ModalBody';

export const ModalFooter = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <footer ref={ref} className={cn('flex justify-end gap-2 border-t border-border bg-overlay px-6 py-4', className)} {...props} />
  ),
);
ModalFooter.displayName = 'ModalFooter';
