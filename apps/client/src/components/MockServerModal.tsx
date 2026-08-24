import { useMemo, useState } from "react";
import { Check, Copy, Globe, Server } from "lucide-react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  Typography,
} from "./ui";
import { cn } from "../lib/utils";
import type { EndpointDto } from "../lib/api";
import {
  buildMockUrl,
  collectProjectMockUrls,
  type MockUrlItem,
} from "../repositories/mock.repository";

interface MockServerModalProps {
  open: boolean;
  onClose: () => void;
  endpoints: EndpointDto[];
}

function statusTone(statusCode: string): string {
  if (/^2\d\d$/.test(statusCode))
    return "border-success/40 bg-success/10 text-success";
  if (/^[45]\d\d$/.test(statusCode))
    return "border-danger/40 bg-danger/10 text-danger";
  if (/^3\d\d$/.test(statusCode))
    return "border-warning/40 bg-warning/10 text-warning";
  return "border-primary/40 bg-primary/10 text-primary";
}

export function MockServerModal({
  open,
  onClose,
  endpoints,
}: MockServerModalProps) {
  const [search, setSearch] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const items = useMemo(() => collectProjectMockUrls(endpoints), [endpoints]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [
        item.endpointMethod,
        item.endpointPath,
        item.endpointSummary,
        item.responseStatus,
        item.exampleName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, search]);

  const copy = async (item: MockUrlItem) => {
    await navigator.clipboard.writeText(buildMockUrl(item.path));
    setCopiedPath(item.path);
    window.setTimeout(() => {
      setCopiedPath((current) => (current === item.path ? null : current));
    }, 1400);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" className="max-h-[85vh]">
      <ModalHeader icon={<Globe className="h-4 w-4" />}>
        <ModalTitle>Mock server URLs</ModalTitle>
        <ModalDescription>
          Every response example is served live by the mock server. Open a URL
          to get the stored payload, or copy it to share.
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by method, path, name…"
          size="sm"
        />

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Server className="h-8 w-8 text-text-muted" aria-hidden="true" />
            <Typography variant="body-sm" tone="secondary">
              No mockable examples yet
            </Typography>
            <Typography variant="caption" tone="muted" className="max-w-sm">
              Add response definitions with examples in an endpoint&apos;s
              Examples tab — they will appear here as servable mock URLs.
            </Typography>
          </div>
        ) : (
          <div className="scroll-y -mx-1 min-h-0 flex-1 px-1">
            <div className="divide-y divide-border border border-border">
              {filtered.map((item) => (
                <div
                  key={item.path}
                  className="flex items-center gap-3 bg-base px-3 py-2 transition-colors hover:bg-overlay"
                >
                  <span
                    className={cn(
                      "method-badge shrink-0",
                      `badge-${item.endpointMethod.toLowerCase()}`,
                    )}
                    aria-hidden="true"
                  >
                    {item.endpointMethod}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-mono text-xs font-semibold text-text-secondary">
                        {item.endpointPath}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                          statusTone(item.responseStatus),
                        )}
                      >
                        {item.responseStatus}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-text-muted">
                      {item.exampleName
                        ? `${item.exampleName}${item.exampleSummary ? ` · ${item.exampleSummary}` : ""}`
                        : `${item.endpointSummary || "Response"} · generated from schema`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={copiedPath === item.path ? "outline" : "primary"}
                    size="sm"
                    onClick={() => void copy(item)}
                    aria-label={`Copy mock URL for ${item.endpointPath}`}
                    className="shrink-0"
                  >
                    {copiedPath === item.path ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedPath === item.path ? "Copied" : "Copy URL"}
                  </Button>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <Typography
                variant="caption"
                tone="muted"
                className="py-4 text-center block"
              >
                No mock URLs match “{search}”.
              </Typography>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Typography variant="caption" tone="muted">
            {items.length} mock URL{items.length === 1 ? "" : "s"} available
          </Typography>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
}
