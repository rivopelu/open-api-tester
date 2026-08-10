import { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  iconOnly?: boolean;
  children?: React.ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center font-body font-semibold cursor-pointer select-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";

const sizeClasses = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-none",
  md: "h-10 px-4 text-sm gap-2 rounded-none",
  lg: "h-11 px-6 text-sm gap-2.5 rounded-none",
};

const iconSizeClasses = {
  sm: "h-8 w-8 p-0 rounded-none",
  md: "h-10 w-10 p-0 rounded-none",
  lg: "h-11 w-11 p-0 rounded-none",
};

const variantClasses = {
  primary:
    "bg-primary text-base border border-primary hover:bg-primary-dark hover:border-primary-dark active:bg-primary-dark",
  secondary:
    "bg-surface text-text-primary border border-border hover:bg-card hover:border-text-muted/40 active:bg-card",
  outline:
    "bg-transparent text-text-primary border border-border hover:border-primary/60 hover:text-primary hover:bg-primary/5 active:bg-primary/10",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-overlay active:bg-border",
  danger:
    "bg-danger/12 border border-danger/30 text-danger hover:bg-danger/20 hover:border-danger/45 active:bg-danger/25",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconOnly = false,
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        baseClasses,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        iconOnly ? iconSizeClasses[size] : sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {iconOnly && loading ? null : children}
    </button>
  ),
);

Button.displayName = "Button";
