import { useEffect, useRef } from "react";
import type { Endpoint } from "@modern-api-studio/types";
import { FileJson2 } from "lucide-react";
import { cn } from "../../lib/utils";

const METHOD_TONE: Record<string, string> = {
  GET: "text-success",
  POST: "text-primary",
  PUT: "text-warning",
  PATCH: "text-warning",
  DELETE: "text-danger",
};

interface Props {
  endpoints: Endpoint[];
  activeIndex: number;
  onSelect: (endpoint: Endpoint) => void;
  onHoverIndex: (index: number) => void;
}

export function EndpointMentionDropdown({
  endpoints,
  activeIndex,
  onSelect,
  onHoverIndex,
}: Props) {
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (endpoints.length === 0) {
    return (
      <div className="absolute bottom-full left-0 z-50 mb-2 w-full border border-border bg-surface p-3 shadow-lg">
        <p className="text-[11px] text-text-muted">
          No endpoints match. Keep typing or press Escape.
        </p>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      className="absolute bottom-full left-0 z-50 mb-2 max-h-52 w-full overflow-y-auto border border-border bg-surface shadow-lg"
    >
      {endpoints.map((endpoint, index) => (
        <button
          key={endpoint.id}
          ref={index === activeIndex ? activeItemRef : undefined}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => onHoverIndex(index)}
          onClick={() => onSelect(endpoint)}
          className={cn(
            "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors",
            index === activeIndex
              ? "bg-primary/10 text-primary"
              : "text-text-secondary hover:bg-overlay hover:text-text-primary",
          )}
        >
          <FileJson2 className="h-3.5 w-3.5 shrink-0" />
          <span
            className={cn(
              "shrink-0 font-mono text-[10px] font-bold",
              METHOD_TONE[endpoint.method] ?? "text-text-muted",
            )}
          >
            {endpoint.method}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono">{endpoint.path}</span>
          {endpoint.summary && (
            <span className="max-w-32 shrink-0 truncate text-text-muted">
              {endpoint.summary}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
