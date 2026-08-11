import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

export function Tooltip({ children, content, className }: { children: ReactNode; content: ReactNode; className?: string }) {
  const id = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setPosition({ left: rect.left + rect.width / 2, top: rect.top })
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        tabIndex={0}
        aria-describedby={id}
        onMouseEnter={show}
        onMouseLeave={() => setPosition(null)}
        onFocus={show}
        onBlur={() => setPosition(null)}
      >
        {children}
      </span>
      {position && createPortal(
        <span
          id={id}
          role="tooltip"
          style={{ left: position.left, top: position.top }}
          className={cn(
            'pointer-events-none fixed z-[9999] max-w-72 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-border bg-card px-2.5 py-1.5 font-mono text-[10px] text-text-primary shadow-lg',
            className,
          )}
        >
          {content}
        </span>,
        document.body,
      )}
    </>
  )
}
