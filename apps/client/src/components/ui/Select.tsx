import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Typography } from './Typography';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

const sizeClasses: Record<NonNullable<SelectProps['size']>, string> = {
  sm: 'h-9 pl-3 pr-8 text-xs rounded-none',
  md: 'h-[42px] pl-3.5 pr-9 text-sm rounded-none',
  lg: 'h-12 pl-4 pr-10 text-sm rounded-none',
};

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option…',
  size = 'md',
  searchable = true,
  clearable = false,
  disabled = false,
  error,
  helperText,
  className,
}: SelectProps) {
  const generatedId = useId();
  const selectId = `${generatedId}-select`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.description?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const message = error ?? helperText;
  const messageId = message ? `${selectId}-message` : undefined;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const openSelect = () => {
    setOpen(true);
    setQuery('');
    setActiveIndex(0);
    window.setTimeout(() => searchRef.current?.focus(), 20);
  };

  const selectOption = (option: SelectOption) => {
    onChange?.(option.value);
    close();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openSelect();
        return;
      }
      const direction = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => {
        const next = (index + direction + filteredOptions.length) % filteredOptions.length;
        requestAnimationFrame(() => {
          (listboxRef.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({
            block: 'nearest',
          });
        });
        return next;
      });
    }
    if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (filteredOptions[activeIndex]) selectOption(filteredOptions[activeIndex]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 20);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative flex w-full flex-col gap-1.5', className)}>
      {label && <Typography as="label" htmlFor={selectId} variant="label">{label}</Typography>}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={messageId}
        onClick={() => (open ? close() : openSelect())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 border border-border bg-overlay text-left font-body font-medium text-text-primary outline-none transition-all duration-200',
          'hover:border-text-muted/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-55',
          error && 'border-danger hover:border-danger focus-visible:border-danger focus-visible:ring-danger/20',
          sizeClasses[size],
        )}
      >
        <span className={cn('flex min-w-0 flex-1 items-center gap-2')}>
          {selectedOption?.icon && (
            <span className="grid h-5 w-5 shrink-0 place-items-center text-text-secondary">
              {selectedOption.icon}
            </span>
          )}
          <span className={cn('truncate', !selectedOption && 'text-text-muted')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        {clearable && selectedOption && !disabled ? (
          <span
            role="button"
            aria-label="Clear selection"
            onClick={(event) => {
              event.stopPropagation();
              onChange?.('');
              setOpen(false);
            }}
            className="-mr-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-none text-text-muted transition-colors hover:bg-overlay hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-text-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {message && (
        <Typography id={messageId} variant="caption" tone={error ? 'danger' : 'muted'}>
          {message}
        </Typography>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute top-[calc(100%+4px)] left-0 z-50 w-full overflow-hidden rounded-none border border-border bg-card"
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search…"
                  className="w-full bg-transparent text-[13px] font-body text-text-primary outline-none placeholder:text-text-muted"
                />
              </div>
            )}
            <ul
              ref={listboxRef}
              role="listbox"
              className="max-h-56 overflow-y-auto p-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-text-muted">No options found</li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === activeIndex;
                  return (
                    <li key={option.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectOption(option)}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-2.5 rounded-none px-3 py-2 text-left transition-colors duration-150',
                          isActive ? 'bg-primary/10' : 'hover:bg-overlay',
                        )}
                      >
                        {option.icon && (
                          <span className="grid h-5 w-5 shrink-0 place-items-center text-text-secondary">
                            {option.icon}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={cn('truncate text-[13px] font-medium', isSelected ? 'text-primary' : 'text-text-primary')}>
                            {option.label}
                          </span>
                          {option.description && (
                            <span className="truncate text-xs text-text-muted">{option.description}</span>
                          )}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Select.displayName = 'Select';