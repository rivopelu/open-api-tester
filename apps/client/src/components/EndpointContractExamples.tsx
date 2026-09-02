import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Endpoint,
  EndpointExample,
  ResponseDefinition,
} from "@modern-api-studio/types";
import {
  AlertCircle,
  ArrowDownUp,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  FileJson2,
  Globe,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button, CodeEditor, Popover, Typography } from "./ui";
import { cn } from "../lib/utils";
import { buildMockUrl } from "../repositories/mock.repository";

interface Props {
  endpoint: Endpoint;
  initialExampleId?: string;
  onSelectExample?: (exampleId?: string) => void;
  onSave: (
    contract: Pick<Endpoint, "requestBody" | "responses">,
  ) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

type SelectedExample =
  | { scope: "request"; id: string }
  | { scope: "response"; responseId: string; id: string };

type Feedback = {
  message: string;
  selection?: SelectedExample;
  target?: "name" | "payload";
  type: "validation" | "save";
};

type DragPayload = {
  id: string;
  name: string;
  summary?: string;
  value: string;
  fromScope: "request" | "response";
  fromResponseId?: string;
};

const COMMON_STATUS_CODES = [
  { code: "200", description: "OK" },
  { code: "201", description: "Created" },
  { code: "204", description: "No Content" },
  { code: "400", description: "Bad Request" },
  { code: "401", description: "Unauthorized" },
  { code: "403", description: "Forbidden" },
  { code: "404", description: "Not Found" },
  { code: "422", description: "Unprocessable Entity" },
  { code: "500", description: "Internal Server Error" },
];

const newExample = (examples: EndpointExample[]): EndpointExample => {
  const usedNames = new Set(examples.map((example) => example.name.trim()));
  let index = 1;
  while (usedNames.has(`example_${index}`)) index += 1;

  return {
    id: crypto.randomUUID(),
    name: `example_${index}`,
    summary: "",
    value: "{\n  \n}",
  };
};

function sameSelection(
  left: SelectedExample | null,
  right: SelectedExample | null,
): boolean {
  if (!left || !right) return left === right;
  if (left.scope !== right.scope || left.id !== right.id) return false;
  return (
    left.scope === "request" ||
    right.scope === "request" ||
    left.responseId === right.responseId
  );
}

function findSelectionById(
  exampleId: string | undefined,
  requestExamples: EndpointExample[],
  responses: ResponseDefinition[],
): SelectedExample | null {
  if (!exampleId) return null;
  if (requestExamples.some((example) => example.id === exampleId))
    return { scope: "request", id: exampleId };

  const response = responses.find((item) =>
    item.examples?.some((example) => example.id === exampleId),
  );
  return response
    ? { scope: "response", responseId: response.id, id: exampleId }
    : null;
}

function firstSelection(
  requestExamples: EndpointExample[],
  responses: ResponseDefinition[],
): SelectedExample | null {
  if (requestExamples[0])
    return { scope: "request", id: requestExamples[0].id };
  for (const response of responses) {
    if (response.examples?.[0]) {
      return {
        scope: "response",
        responseId: response.id,
        id: response.examples[0].id,
      };
    }
  }
  return null;
}

function selectionExists(
  selection: SelectedExample | null,
  requestExamples: EndpointExample[],
  responses: ResponseDefinition[],
): boolean {
  if (!selection) return false;
  if (selection.scope === "request")
    return requestExamples.some((example) => example.id === selection.id);
  return responses.some(
    (response) =>
      response.id === selection.responseId &&
      response.examples?.some((example) => example.id === selection.id),
  );
}

function validateGroup(
  examples: EndpointExample[],
  label: string,
  selectionFor: (id: string) => SelectedExample,
): Feedback | null {
  const names = new Set<string>();

  for (const example of examples) {
    const selection = selectionFor(example.id);
    const name = example.name.trim();
    if (!name) {
      return {
        type: "validation",
        selection,
        target: "name",
        message: `${label} example name cannot be empty.`,
      };
    }
    if (names.has(name)) {
      return {
        type: "validation",
        selection,
        target: "name",
        message: `${label} contains more than one example named “${name}”. Use a unique name.`,
      };
    }
    names.add(name);

    try {
      JSON.parse(example.value);
    } catch {
      return {
        type: "validation",
        selection,
        target: "payload",
        message: `${name} contains invalid JSON. Fix the payload before saving.`,
      };
    }
  }

  return null;
}

function validateDrafts(
  requestExamples: EndpointExample[],
  responses: ResponseDefinition[],
): Feedback | null {
  const requestIssue = validateGroup(requestExamples, "Request", (id) => ({
    scope: "request",
    id,
  }));
  if (requestIssue) return requestIssue;

  for (const response of responses) {
    const issue = validateGroup(
      response.examples ?? [],
      `Response ${response.statusCode}`,
      (id) => ({ scope: "response", responseId: response.id, id }),
    );
    if (issue) return issue;
  }

  return null;
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

export function EndpointContractExamples({
  endpoint,
  initialExampleId,
  onSelectExample,
  onSave,
  onDirtyChange,
}: Props) {
  const [requestExamples, setRequestExamples] = useState<EndpointExample[]>([]);
  const [responses, setResponses] = useState<ResponseDefinition[]>([]);
  const [selected, setSelected] = useState<SelectedExample | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [activeDragTarget, setActiveDragTarget] = useState<string | null>(null);
  const [newStatusCode, setNewStatusCode] = useState("");
  const savedTimer = useRef<number | undefined>(undefined);
  const endpointId = useRef(endpoint.id);
  const persistedRequestExamples = endpoint.requestBody?.examples ?? [];
  const persistedResponses = endpoint.responses;
  const persistedRequestSignature = JSON.stringify(persistedRequestExamples);
  const persistedResponseSignature = JSON.stringify(persistedResponses);

  const dirty = useMemo(
    () =>
      JSON.stringify(requestExamples) !== persistedRequestSignature ||
      JSON.stringify(responses) !== persistedResponseSignature,
    [
      persistedRequestSignature,
      persistedResponseSignature,
      requestExamples,
      responses,
    ],
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const nextRequestExamples = persistedRequestExamples;
    const nextResponses = persistedResponses;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequestExamples(nextRequestExamples);
    setResponses(nextResponses);
    setFeedback(null);
    setSelected((current) => {
      if (selectionExists(current, nextRequestExamples, nextResponses))
        return current;
      return firstSelection(nextRequestExamples, nextResponses);
    });

    if (endpointId.current !== endpoint.id) {
      if (savedTimer.current !== undefined)
        window.clearTimeout(savedTimer.current);
      setSaved(false);
      endpointId.current = endpoint.id;
    }
  }, [endpoint.id, persistedRequestSignature, persistedResponseSignature]);

  useEffect(() => {
    const requested = findSelectionById(
      initialExampleId,
      requestExamples,
      responses,
    );
    if (requested)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected((current) =>
        sameSelection(current, requested) ? current : requested,
      );
  }, [initialExampleId, requestExamples, responses]);

  useEffect(
    () => () => {
      if (savedTimer.current !== undefined)
        window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const activeResponse =
    selected?.scope === "response"
      ? responses.find((response) => response.id === selected.responseId)
      : undefined;
  const active =
    selected?.scope === "request"
      ? requestExamples.find((example) => example.id === selected.id)
      : selected?.scope === "response"
        ? activeResponse?.examples?.find(
            (example) => example.id === selected.id,
          )
        : undefined;
  const activeHasFeedback = Boolean(
    feedback?.selection &&
    selected &&
    sameSelection(feedback.selection, selected),
  );
  const activeNameHasError = activeHasFeedback && feedback?.target === "name";
  const activePayloadHasError =
    activeHasFeedback && feedback?.target === "payload";
  const totalExamples =
    requestExamples.length +
    responses.reduce(
      (total, response) => total + (response.examples?.length ?? 0),
      0,
    );

  const mockPath =
    selected?.scope === "response" && activeResponse
      ? `/api/mock/${endpoint.id}/ex/${selected.id}`
      : null;
  const [copiedMock, setCopiedMock] = useState(false);
  const copyMockUrl = async () => {
    if (!mockPath) return;
    await navigator.clipboard.writeText(buildMockUrl(mockPath));
    setCopiedMock(true);
    window.setTimeout(() => setCopiedMock(false), 1400);
  };

  const markChanged = () => {
    if (savedTimer.current !== undefined)
      window.clearTimeout(savedTimer.current);
    setSaved(false);
    setFeedback(null);
  };

  const selectExample = (selection: SelectedExample | null) => {
    setSelected(selection);
    onSelectExample?.(selection?.id);
  };

  const updateActive = (changes: Partial<EndpointExample>) => {
    if (!selected) return;
    markChanged();
    if (selected.scope === "request") {
      setRequestExamples((items) =>
        items.map((item) =>
          item.id === selected.id ? { ...item, ...changes } : item,
        ),
      );
      return;
    }
    setResponses((items) =>
      items.map((response) =>
        response.id === selected.responseId
          ? {
              ...response,
              examples: (response.examples ?? []).map((item) =>
                item.id === selected.id ? { ...item, ...changes } : item,
              ),
            }
          : response,
      ),
    );
  };

  const addRequest = () => {
    const example = newExample(requestExamples);
    markChanged();
    setRequestExamples((items) => [...items, example]);
    selectExample({ scope: "request", id: example.id });
  };

  const addResponse = (responseId: string) => {
    const response = responses.find((item) => item.id === responseId);
    if (!response) return;
    const example = newExample(response.examples ?? []);
    markChanged();
    setResponses((items) =>
      items.map((item) =>
        item.id === responseId
          ? { ...item, examples: [...(item.examples ?? []), example] }
          : item,
      ),
    );
    selectExample({ scope: "response", responseId, id: example.id });
  };

  const addResponseDefinition = (code?: string, description?: string) => {
    const status = (code || newStatusCode || "200").trim();
    if (!status) return;

    const existing = responses.find((r) => r.statusCode === status);
    if (existing) {
      addResponse(existing.id);
      return;
    }

    const defaultDesc =
      description ||
      COMMON_STATUS_CODES.find((item) => item.code === status)?.description ||
      "Response";

    const newResp: ResponseDefinition = {
      id: crypto.randomUUID(),
      statusCode: status,
      description: defaultDesc,
      schema: [],
      examples: [
        {
          id: crypto.randomUUID(),
          name: "example_1",
          summary: "",
          value: "{\n  \n}",
        },
      ],
    };

    markChanged();
    setResponses((prev) => [...prev, newResp]);
    setNewStatusCode("");
    selectExample({
      scope: "response",
      responseId: newResp.id,
      id: newResp.examples![0].id,
    });
  };

  const removeActive = () => {
    if (!selected) return;
    markChanged();

    if (selected.scope === "request") {
      const nextRequestExamples = requestExamples.filter(
        (item) => item.id !== selected.id,
      );
      const nextSelection = nextRequestExamples[0]
        ? { scope: "request" as const, id: nextRequestExamples[0].id }
        : firstSelection(nextRequestExamples, responses);
      setRequestExamples(nextRequestExamples);
      selectExample(nextSelection);
      return;
    }

    const nextResponses = responses.map((response) =>
      response.id === selected.responseId
        ? {
            ...response,
            examples: (response.examples ?? []).filter(
              (item) => item.id !== selected.id,
            ),
          }
        : response,
    );
    const sameGroup = nextResponses.find(
      (response) => response.id === selected.responseId,
    )?.examples?.[0];
    const nextSelection = sameGroup
      ? {
          scope: "response" as const,
          responseId: selected.responseId,
          id: sameGroup.id,
        }
      : firstSelection(requestExamples, nextResponses);
    setResponses(nextResponses);
    selectExample(nextSelection);
  };

  const moveExample = (
    example: EndpointExample,
    target: { scope: "request" } | { scope: "response"; responseId?: string },
    from: { scope: "request" } | { scope: "response"; responseId?: string },
  ) => {
    if (
      target.scope === from.scope &&
      (target.scope === "request" || target.responseId === from.responseId)
    ) {
      return;
    }

    markChanged();

    let cleanedRequest = requestExamples;
    let cleanedResponses = responses;

    if (from.scope === "request") {
      cleanedRequest = requestExamples.filter((item) => item.id !== example.id);
    } else if (from.responseId) {
      cleanedResponses = responses.map((res) =>
        res.id === from.responseId
          ? {
              ...res,
              examples: (res.examples ?? []).filter((item) => item.id !== example.id),
            }
          : res,
      );
    }

    if (target.scope === "request") {
      const nextRequest = [...cleanedRequest, example];
      setRequestExamples(nextRequest);
      setResponses(cleanedResponses);
      selectExample({ scope: "request", id: example.id });
    } else {
      let targetResponseId = target.responseId;

      // Jika belum ada response sama sekali, buatkan 200 OK secara otomatis
      if (!targetResponseId || !cleanedResponses.some((r) => r.id === targetResponseId)) {
        if (cleanedResponses.length === 0) {
          const auto200: ResponseDefinition = {
            id: crypto.randomUUID(),
            statusCode: "200",
            description: "OK",
            schema: [],
            examples: [example],
          };
          setRequestExamples(cleanedRequest);
          setResponses([auto200]);
          selectExample({
            scope: "response",
            responseId: auto200.id,
            id: example.id,
          });
          return;
        }
        targetResponseId = cleanedResponses[0].id;
      }

      const nextResponses = cleanedResponses.map((res) =>
        res.id === targetResponseId
          ? {
              ...res,
              examples: [...(res.examples ?? []), example],
            }
          : res,
      );
      setRequestExamples(cleanedRequest);
      setResponses(nextResponses);
      selectExample({
        scope: "response",
        responseId: targetResponseId,
        id: example.id,
      });
    }
  };

  const handleDragStart = (
    e: React.DragEvent,
    example: EndpointExample,
    fromScope: "request" | "response",
    fromResponseId?: string,
  ) => {
    const payload: DragPayload = {
      id: example.id,
      name: example.name,
      summary: example.summary,
      value: example.value,
      fromScope,
      fromResponseId,
    };
    const jsonStr = JSON.stringify(payload);
    e.dataTransfer.setData("application/json", jsonStr);
    e.dataTransfer.setData("text/plain", jsonStr);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (
    e: React.DragEvent,
    target: { scope: "request" } | { scope: "response"; responseId?: string },
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragTarget(null);

    let raw = "";
    try {
      raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain") || "";
    } catch {
      raw = "";
    }
    if (!raw) return;

    try {
      const payload: DragPayload = JSON.parse(raw);
      if (!payload.id) return;

      const example: EndpointExample = {
        id: payload.id,
        name: payload.name,
        summary: payload.summary,
        value: payload.value,
      };

      moveExample(
        example,
        target,
        payload.fromScope === "request"
          ? { scope: "request" }
          : { scope: "response", responseId: payload.fromResponseId },
      );
    } catch {
      // ignore invalid drag payload
    }
  };

  const save = useCallback(async () => {
    const hasChanges =
      JSON.stringify(requestExamples) !==
        JSON.stringify(endpoint.requestBody?.examples ?? []) ||
      JSON.stringify(responses) !== JSON.stringify(endpoint.responses);
    if (!hasChanges || saving) return;

    const issue = validateDrafts(requestExamples, responses);
    if (issue) {
      setFeedback(issue);
      if (issue.selection) {
        setSelected(issue.selection);
        onSelectExample?.(issue.selection.id);
      }
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await onSave({
        requestBody: requestExamples.length
          ? {
              required: endpoint.requestBody?.required ?? false,
              contentType:
                endpoint.requestBody?.contentType ?? "application/json",
              schema: endpoint.requestBody?.schema ?? [],
              ...endpoint.requestBody,
              examples: requestExamples,
            }
          : endpoint.requestBody
            ? { ...endpoint.requestBody, examples: [] }
            : undefined,
        responses,
      });
      if (savedTimer.current !== undefined)
        window.clearTimeout(savedTimer.current);
      setSaved(true);
      savedTimer.current = window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setFeedback({
        type: "save",
        message:
          error instanceof Error
            ? error.message
            : "Contract examples could not be saved. Try again.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    endpoint.requestBody,
    endpoint.responses,
    onSave,
    onSelectExample,
    requestExamples,
    responses,
    saving,
  ]);

  useEffect(() => {
    const saveExamples = () => void save();
    window.addEventListener("api-studio:save", saveExamples);
    return () => window.removeEventListener("api-studio:save", saveExamples);
  }, [save]);

  const statusMessage = saving
    ? "Saving contract examples…"
    : feedback?.message
      ? feedback.message
      : saved
        ? "Contract examples saved."
        : dirty
          ? "Unsaved changes · Ctrl+S to save"
          : "All contract examples are saved.";

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-auto bg-base lg:grid-cols-[260px_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="flex max-h-72 min-h-0 flex-col border-b border-border bg-overlay/50 lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <div className="min-w-0 flex-1">
            <Typography variant="label" as="h3" className="truncate">
              Contract examples
            </Typography>
            <Typography variant="caption" tone="muted" as="p">
              {totalExamples} payload{totalExamples === 1 ? "" : "s"}
            </Typography>
          </div>
          {dirty && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning"
              title="Unsaved changes"
              aria-label="Unsaved changes"
            />
          )}

          {/* Add menu with choice: Request vs Response */}
          <Popover
            align="end"
            className="w-56 p-1"
            trigger={({ open }) => (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Add example"
                title="Add request or response example"
                className={cn(open && "bg-overlay text-primary")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          >
            {({ close }) => (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    addRequest();
                    close();
                  }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-text-primary hover:bg-overlay hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Add Request Example</span>
                </button>
                <div className="my-1 border-t border-border" />
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Add Response Example
                </div>
                {responses.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      addResponseDefinition("200", "OK");
                      close();
                    }}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-success hover:bg-overlay"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create 200 Response</span>
                  </button>
                ) : (
                  responses.map((resp) => (
                    <button
                      key={resp.id}
                      type="button"
                      onClick={() => {
                        addResponse(resp.id);
                        close();
                      }}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-overlay hover:text-text-primary"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "border px-1 py-0.5 font-mono text-[9px] font-bold",
                            statusTone(resp.statusCode),
                          )}
                        >
                          {resp.statusCode}
                        </span>
                        <span className="truncate">{resp.description || "Response"}</span>
                      </span>
                      <Plus className="h-3 w-3 text-text-muted" />
                    </button>
                  ))
                )}
              </div>
            )}
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={() => void save()}
            loading={saving}
            disabled={!dirty}
            aria-label="Save contract examples"
          >
            {saved ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="scroll-y min-h-0 flex-1 py-2">
          {/* REQUEST DROP ZONE */}
          <section
            aria-labelledby="request-examples-heading"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (activeDragTarget !== "request") setActiveDragTarget("request");
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setActiveDragTarget("request");
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setActiveDragTarget(null);
            }}
            onDrop={(e) => handleDrop(e, { scope: "request" })}
            className={cn(
              "rounded-none transition-all p-1.5 border border-transparent",
              activeDragTarget === "request" && "border-primary bg-primary/10",
            )}
          >
            <div className="flex h-8 items-center justify-between px-3">
              <span
                id="request-examples-heading"
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted"
              >
                Request
              </span>
              <button
                type="button"
                onClick={addRequest}
                className="p-1 text-text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Add request example"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {requestExamples.length === 0 ? (
              <button
                type="button"
                onClick={addRequest}
                className="mx-2 flex w-[calc(100%-1rem)] items-center gap-2 border border-dashed border-border px-2.5 py-2 text-left text-[10px] text-text-muted transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-3 w-3" /> Add request example
              </button>
            ) : (
              requestExamples.map((example) => (
                <div
                  key={example.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, example, "request")}
                  className="group/item relative flex items-center"
                >
                  <button
                    type="button"
                    onClick={() =>
                      selectExample({ scope: "request", id: example.id })
                    }
                    aria-pressed={
                      selected?.scope === "request" && selected.id === example.id
                    }
                    className={cn(
                      "flex h-8 w-full items-center gap-2 border-l-2 px-3 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                      selected?.scope === "request" && selected.id === example.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent text-text-secondary hover:bg-surface hover:text-text-primary",
                    )}
                  >
                    <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-text-muted opacity-40 group-hover/item:opacity-100" />
                    <FileJson2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {example.name || "Unnamed example"}
                    </span>
                  </button>
                </div>
              ))
            )}
          </section>

          <div className="mx-3 my-3 border-t border-border" />

          {/* RESPONSES SECTION & DEFINITION CREATION */}
          <div className="flex h-8 items-center justify-between px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
              Responses
            </span>
            <Popover
              align="end"
              className="w-56 p-2"
              trigger={({ open }) => (
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 p-1 text-[10px] font-semibold text-primary transition-colors hover:bg-surface hover:text-primary-dark focus-visible:outline-none",
                    open && "text-primary-dark",
                  )}
                  aria-label="Add Response Definition"
                  title="Add response status code"
                >
                  <Plus className="h-3.5 w-3.5" /> Response
                </button>
              )}
            >
              {({ close }) => (
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Quick Add Status
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    {COMMON_STATUS_CODES.map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          addResponseDefinition(s.code, s.description);
                          close();
                        }}
                        className={cn(
                          "border px-1.5 py-1 text-center font-mono text-[10px] font-bold transition-colors hover:bg-overlay",
                          statusTone(s.code),
                        )}
                      >
                        {s.code}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border pt-2">
                    <div className="mb-1 text-[10px] text-text-muted">Custom status code</div>
                    <div className="flex gap-1.5">
                      <input
                        value={newStatusCode}
                        onChange={(e) => setNewStatusCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="200"
                        maxLength={3}
                        className="h-7 w-20 border border-border bg-base px-2 font-mono text-xs text-text-primary outline-none focus:border-primary"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!newStatusCode.trim()}
                        onClick={() => {
                          addResponseDefinition();
                          close();
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Popover>
          </div>

          {responses.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (activeDragTarget !== "responses-empty") setActiveDragTarget("responses-empty");
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setActiveDragTarget("responses-empty");
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setActiveDragTarget(null);
              }}
              onDrop={(e) => handleDrop(e, { scope: "response" })}
              className={cn(
                "mx-2 my-1 border border-dashed border-border p-3 text-center transition-all",
                activeDragTarget === "responses-empty" && "border-primary bg-primary/10 ring-2 ring-primary",
              )}
            >
              <p className="mb-2 text-[11px] leading-4 text-text-muted">
                No response definitions yet. Drop payload here to create 200 OK Response.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addResponseDefinition("200", "OK")}
                className="w-full text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add 200 OK Response
              </Button>
            </div>
          ) : (
            responses.map((response) => {
              const examples = response.examples ?? [];
              const isDragOver = activeDragTarget === `response-${response.id}`;

              return (
                <section
                  key={response.id}
                  aria-labelledby={`response-${response.id}-heading`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    const targetId = `response-${response.id}`;
                    if (activeDragTarget !== targetId) setActiveDragTarget(targetId);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setActiveDragTarget(`response-${response.id}`);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setActiveDragTarget(null);
                  }}
                  onDrop={(e) => handleDrop(e, { scope: "response", responseId: response.id })}
                  className={cn(
                    "mb-2 rounded-none p-1.5 transition-all border border-transparent",
                    isDragOver && "border-primary bg-primary/10",
                  )}
                >
                  <div className="flex min-h-8 items-center gap-2 px-3">
                    <span
                      id={`response-${response.id}-heading`}
                      className={cn(
                        "border px-1.5 py-0.5 font-mono text-[10px] font-bold",
                        statusTone(response.statusCode),
                      )}
                    >
                      {response.statusCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-text-muted">
                      {response.description || "Response"}
                    </span>
                    <button
                      type="button"
                      onClick={() => addResponse(response.id)}
                      className="p-1 text-text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Add ${response.statusCode} response example`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {examples.length === 0 ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setActiveDragTarget(`response-${response.id}`);
                      }}
                      onDrop={(e) => handleDrop(e, { scope: "response", responseId: response.id })}
                      className="mx-2 my-1 border border-dashed border-border px-3 py-2 text-center text-[10px] text-text-muted transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      <button
                        type="button"
                        onClick={() => addResponse(response.id)}
                        className="w-full text-left"
                      >
                        No examples · Drop payload here or + Add
                      </button>
                    </div>
                  ) : (
                    examples.map((example) => (
                      <div
                        key={example.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, example, "response", response.id)}
                        className="group/item relative flex items-center"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            selectExample({
                              scope: "response",
                              responseId: response.id,
                              id: example.id,
                            })
                          }
                          aria-pressed={
                            selected?.scope === "response" &&
                            selected.id === example.id
                          }
                          className={cn(
                            "flex h-8 w-full items-center gap-2 border-l-2 px-3 pl-5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                            selected?.scope === "response" &&
                              selected.id === example.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-transparent text-text-secondary hover:bg-surface hover:text-text-primary",
                          )}
                        >
                          <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-text-muted opacity-40 group-hover/item:opacity-100" />
                          <FileJson2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {example.name || "Unnamed example"}
                          </span>
                        </button>
                      </div>
                    ))
                  )}
                </section>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-107.5 min-w-0 flex-col bg-base">
        {!active ? (
          <div className="flex min-h-107.5 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center border border-border bg-overlay text-text-muted">
              <FileJson2 className="h-4 w-4" />
            </span>
            <Typography variant="label" as="p" className="mb-1">
              No contract example selected
            </Typography>
            <Typography
              variant="body-sm"
              tone="muted"
              className="mb-4 max-w-md"
            >
              Create a named request or response payload for documentation,
              testing, and generated OpenAPI output.
            </Typography>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" onClick={addRequest}>
                <Plus className="h-3.5 w-3.5" />
                Add request example
              </Button>
              {responses[0] ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addResponse(responses[0].id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add {responses[0].statusCode} response
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addResponseDefinition("200", "OK")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create 200 Response
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
              <FileJson2 className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <Typography variant="label" as="h3" className="truncate">
                  {active.name || "Unnamed example"}
                </Typography>
                <Typography variant="caption" tone="muted" as="p">
                  {selected?.scope === "request"
                    ? `Request · ${endpoint.requestBody?.contentType ?? "application/json"}`
                    : `Response ${activeResponse?.statusCode ?? ""} · ${activeResponse?.contentType ?? "application/json"}`}
                </Typography>
              </div>

              {/* Move/Transfer helper dropdown */}
              <Popover
                align="end"
                className="w-64 p-1"
                trigger={({ open }) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-1 text-xs", open && "bg-overlay text-primary")}
                    title="Move example between Request and Responses"
                  >
                    <ArrowDownUp className="h-3.5 w-3.5" />
                    <span>Move to…</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                )}
              >
                {({ close }) => (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Move example payload to:
                    </div>
                    {selected?.scope !== "request" && (
                      <button
                        type="button"
                        onClick={() => {
                          moveExample(active, { scope: "request" }, selected!);
                          close();
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-text-primary hover:bg-overlay hover:text-primary"
                      >
                        <FileJson2 className="h-3.5 w-3.5 text-primary" />
                        <span>Request Body</span>
                      </button>
                    )}
                    {responses.map((resp) => {
                      const isCurrent =
                        selected?.scope === "response" &&
                        selected.responseId === resp.id;
                      if (isCurrent) return null;
                      return (
                        <button
                          key={resp.id}
                          type="button"
                          onClick={() => {
                            moveExample(
                              active,
                              { scope: "response", responseId: resp.id },
                              selected!,
                            );
                            close();
                          }}
                          className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-overlay hover:text-text-primary"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "border px-1 py-0.5 font-mono text-[9px] font-bold",
                                statusTone(resp.statusCode),
                              )}
                            >
                              {resp.statusCode}
                            </span>
                            <span className="truncate">{resp.description || "Response"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Popover>

              {selected?.scope === "response" && activeResponse && (
                <span
                  className={cn(
                    "border px-2 py-1 font-mono text-[10px] font-bold",
                    statusTone(activeResponse.statusCode),
                  )}
                >
                  {activeResponse.statusCode}
                </span>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={removeActive}
                aria-label={`Delete ${active.name || "example"}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>

            {/* Mock Server URL Dedicated Grid Panel */}
            {mockPath && (
              <div className="flex flex-col gap-2 border-b border-border bg-overlay/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-text-muted">
                    <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span>Mock URL:</span>
                  </span>
                  <code className="min-w-0 flex-1 truncate bg-base px-2 py-1 font-mono text-[11px] text-text-primary border border-border">
                    {buildMockUrl(mockPath)}
                  </code>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void copyMockUrl()}
                    className="h-7 px-2.5 text-xs gap-1.5 border border-border bg-base hover:bg-overlay"
                    title="Copy Mock URL"
                  >
                    {copiedMock ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(buildMockUrl(mockPath), "_blank", "noopener,noreferrer")}
                    className="h-7 px-2.5 text-xs gap-1.5 border border-border bg-base hover:bg-overlay"
                    title="Open mock URL in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open</span>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid shrink-0 border-b border-border bg-surface md:grid-cols-[minmax(160px,0.8fr)_minmax(220px,1.2fr)]">
              <label className="min-w-0 border-b border-border p-3 md:border-b-0 md:border-r">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Example name
                </span>
                <input
                  value={active.name}
                  onChange={(event) =>
                    updateActive({
                      name: event.target.value.replace(/\s+/g, "_"),
                    })
                  }
                  placeholder="success_200"
                  aria-invalid={activeNameHasError || undefined}
                  className={cn(
                    "h-9 w-full border bg-base px-3 font-mono text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary focus-visible:ring-1 focus-visible:ring-primary",
                    activeNameHasError ? "border-danger" : "border-border",
                  )}
                />
              </label>
              <label className="min-w-0 p-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
                  Summary{" "}
                  <span className="font-normal normal-case tracking-normal">
                    (optional)
                  </span>
                </span>
                <input
                  value={active.summary ?? ""}
                  onChange={(event) =>
                    updateActive({ summary: event.target.value })
                  }
                  placeholder="What this payload represents"
                  className="h-9 w-full border border-border bg-base px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                />
              </label>
            </div>

            <CodeEditor
              value={active.value}
              onChange={(value) => updateActive({ value })}
              label={
                selected?.scope === "request"
                  ? "Request payload"
                  : `${activeResponse?.statusCode ?? ""} response payload`
              }
              className={cn(
                "min-h-65 flex-1",
                activePayloadHasError && "border border-danger",
              )}
            />

            <div className="flex min-h-14 shrink-0 flex-col gap-3 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                role={feedback ? "alert" : "status"}
                className={cn(
                  "flex min-w-0 items-start gap-2 text-[11px]",
                  feedback
                    ? "text-danger"
                    : saved
                      ? "text-success"
                      : dirty
                        ? "text-warning"
                        : "text-text-muted",
                )}
              >
                {feedback ? (
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : saved ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : null}
                <span>{statusMessage}</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                disabled={!dirty}
                onClick={() => void save()}
              >
                {saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? "Saving" : saved ? "Saved" : "Save contract"}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

