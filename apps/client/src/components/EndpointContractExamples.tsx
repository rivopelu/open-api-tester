import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Endpoint,
  EndpointExample,
  ResponseDefinition,
} from "@modern-api-studio/types";
import {
  AlertCircle,
  Check,
  Copy,
  FileJson2,
  Globe,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button, CodeEditor, Typography } from "./ui";
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
    <div className="grid h-full min-h-0 grid-cols-1 overflow-auto bg-base lg:grid-cols-[248px_minmax(0,1fr)] lg:overflow-hidden">
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
          <section aria-labelledby="request-examples-heading">
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
                <button
                  key={example.id}
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
                  <FileJson2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {example.name || "Unnamed example"}
                  </span>
                </button>
              ))
            )}
          </section>

          <div className="mx-3 my-2 border-t border-border" />
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
            Responses
          </div>
          {responses.length === 0 ? (
            <p className="px-3 py-2 text-[10px] leading-4 text-text-muted">
              Add a response definition before creating response examples.
            </p>
          ) : (
            responses.map((response) => {
              const examples = response.examples ?? [];
              return (
                <section
                  key={response.id}
                  className="mb-2"
                  aria-labelledby={`response-${response.id}-heading`}
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
                    <button
                      type="button"
                      onClick={() => addResponse(response.id)}
                      className="mx-3 block text-[10px] text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      No examples · Add one
                    </button>
                  ) : (
                    examples.map((example) => (
                      <button
                        key={example.id}
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
                        <FileJson2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {example.name || "Unnamed example"}
                        </span>
                      </button>
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
              {responses[0] && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addResponse(responses[0].id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add {responses[0].statusCode} response
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
                {mockPath && (
                  <button
                    type="button"
                    onClick={() => void copyMockUrl()}
                    title="Copy mock URL"
                    className="mt-0.5 flex max-w-full items-center gap-1 text-left font-mono text-[11px] text-primary/90 transition-colors hover:text-primary"
                  >
                    <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate underline decoration-dotted underline-offset-2">
                      {buildMockUrl(mockPath)}
                    </span>
                    {copiedMock ? (
                      <Check
                        className="h-3 w-3 shrink-0 text-success"
                        aria-label="Copied"
                      />
                    ) : (
                      <Copy
                        className="h-3 w-3 shrink-0 opacity-60"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )}
              </div>
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
