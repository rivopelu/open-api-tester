import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Typography } from './Typography';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  mono?: boolean;
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  showClear?: boolean;
  onClear?: () => void;
}

const sizeClasses = {
  sm: 'h-9 pl-3 pr-3 text-xs rounded-lg',
  md: 'h-[42px] pl-3.5 pr-3.5 text-sm rounded-lg',
  lg: 'h-12 pl-4 pr-4 text-sm rounded-lg',
};

const iconWidthClasses = {
  sm: 'pl-8',
  md: 'pl-9',
  lg: 'pl-10',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, mono = false, size = 'md', leadingIcon, trailingIcon, showClear = false, onClear, className, id, value, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const message = error ?? helperText;
    const messageId = message ? `${inputId}-message` : undefined;
    const hasClear = showClear && !props.disabled && value !== '' && value != null;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <Typography as="label" htmlFor={inputId} variant="label">{label}</Typography>}
        <div className={cn(
              'relative w-full border border-border bg-overlay transition-colors duration-200 rounded-lg hover:border-text-muted/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
              error && 'border-danger hover:border-danger focus-within:border-danger focus-within:ring-danger/20',
              props.disabled && 'opacity-55',
            )}>
          {leadingIcon && (
            <span className={cn(
              'pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted',
              size === 'sm' ? 'text-sm' : 'text-base',
            )}>
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            value={value}
            className={cn(
              'w-full bg-transparent text-text-primary font-body outline-none transition-colors duration-200',
              'placeholder:text-text-muted',
              'disabled:cursor-not-allowed',
              mono && 'font-mono',
              sizeClasses[size],
              leadingIcon && iconWidthClasses[size],
              (hasClear || trailingIcon) && 'pr-9',
              className,
            )}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={messageId}
            {...props}
          />
          {(hasClear || trailingIcon) && (
            <span className="absolute inset-y-0 right-2.5 flex items-center">
              {hasClear ? (
                <button
                  type="button"
                  aria-label="Clear input"
                  onClick={onClear}
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-text-muted transition-colors hover:bg-overlay hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="flex items-center text-text-muted">{trailingIcon}</span>
              )}
            </span>
          )}
        </div>
        {message && <Typography id={messageId} variant="caption" tone={error ? 'danger' : 'muted'}>{message}</Typography>}
      </div>
    );
  },
);

Input.displayName = 'Input';