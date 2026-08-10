import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt: string;
  fallback?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ src, alt, fallback, size = 'md', className, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={cn(
        'inline-grid flex-none place-items-center overflow-hidden rounded-none font-heading font-bold',
        'bg-purple/15 text-purple',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src && !failed
        ? <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
        : <span aria-label={alt}>{fallback ?? alt.charAt(0).toUpperCase()}</span>}
    </div>
  );
}