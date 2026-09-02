import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { Endpoint } from "@modern-api-studio/types";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CornerDownLeft,
  FileJson2,
  Hash,
  History,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  api,
  chatStream,
  confirmAssistantTool,
  unwrap,
  type AssistantContextDto,
  type ChatMessageDto,
  type ChatSessionDto,
  type LlmModelDto,
} from "../../lib/api";
import { useApiSpecStore } from "../../store/useApiSpecStore";
import { useAssistantEffectStore } from "../../store/useAssistantEffectStore";
import { useUiStore } from "../../store/useUiStore";
import { formatToolLabel } from "../../lib/toolLabels";
import { Button, Select, type SelectOption } from "../ui";
import {
  AssistantResponseView,
  type ToolCallEvent,
} from "./AssistantResponseView";
import { EndpointMentionDropdown } from "./EndpointMentionDropdown";

// Fallback model list matching server constants
const FALLBACK_MODELS: LlmModelDto[] = [
  {
    id: "ag/gemini-3.7-flash-high",
    label: "Gemini 3.7 Flash High",
    provider: "Google",
  },
  {
    id: "ag/gemini-3.7-flash-low",
    label: "Gemini 3.7 Flash Low",
    provider: "Google",
  },
  {
    id: "ag/gemini-3.6-flash-high",
    label: "Gemini 3.6 Flash High",
    provider: "Google",
  },
  { id: "cx/gpt-5.6-luna", label: "GPT-5.6 Luna", provider: "OpenAI" },
  { id: "cx/gpt-5.6-terra", label: "GPT-5.6 Terra", provider: "OpenAI" },
  { id: "oc/big-pickle", label: "Big Pickle", provider: "OpenCode" },
  { id: "oc/mimo-v2.5-free", label: "MiMo v2.5", provider: "Xiaomi" },
  { id: "oc/laguna-s-2.1-free", label: "Laguna S 2.1", provider: "Poolside" },
];

const SUGGESTIONS = [
  {
    label: "Check upcoming API breaking changes",
    prompt: "Periksa potensi breaking changes pada endpoint saya",
  },
  {
    label: "Plan a product launch API contract",
    prompt: "Buatkan API contract rencana rilis fitur baru",
  },
  {
    label: "Explain how OpenAPI schema works",
    prompt: "Jelaskan cara kerja skema OpenAPI 3.0 dan relasinya",
  },
];

export interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  messagesCount?: number;
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "idle" | "loading" | "streaming" | "error";
  errorMessage?: string;
  modelLabel?: string;
  modelProvider?: string;
  toolEvents?: ToolCallEvent[];
}

export interface PendingToolConfirmation {
  confirmationId: string;
  toolId: string;
  toolName: string;
  args: Record<string, unknown>;
  summary: string;
  loading?: boolean;
}

function formatTimeAgo(timestamp?: number | null): string {
  if (!timestamp) return "Recently";
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AssistantDrawer() {
  const { assistantOpen, setAssistantOpen } = useUiStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<"chat" | "sessions">("chat");
  const [models, setModels] = useState<LlmModelDto[]>(FALLBACK_MODELS);
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState<string>(
    FALLBACK_MODELS[0].id,
  );
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<
    PendingToolConfirmation[]
  >([]);

  const specEndpoints = useApiSpecStore((s) => s.spec.endpoints);

  // Mention / attachment state
  const [mentionedEndpointIds, setMentionedEndpointIds] = useState<string[]>(
    [],
  );
  const [dismissedActiveEndpointId, setDismissedActiveEndpointId] = useState<
    string | null
  >(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);
  const [mentionTriggerStart, setMentionTriggerStart] = useState<
    number | null
  >(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Compute current page context from URL and search params
  const rawActiveEndpointId = searchParams.get("endpoint") ?? undefined;

  const currentContext: AssistantContextDto = useMemo(() => {
    const pathname = location.pathname;
    let projectId: string | undefined;

    // Match /projects/:projectId or /projects/:projectId/*
    const projectMatch = pathname.match(/\/projects\/([^/]+)/);
    if (projectMatch && projectMatch[1]) {
      projectId = projectMatch[1];
    }

    const endpointId =
      rawActiveEndpointId && rawActiveEndpointId !== dismissedActiveEndpointId
        ? rawActiveEndpointId
        : undefined;
    const tab = searchParams.get("tab") ?? undefined;
    const exampleId = searchParams.get("example") ?? undefined;

    return {
      pathname,
      projectId,
      endpointId,
      tab,
      exampleId,
      mentionedEndpointIds:
        mentionedEndpointIds.length > 0 ? mentionedEndpointIds : undefined,
    };
  }, [
    location.pathname,
    searchParams,
    rawActiveEndpointId,
    dismissedActiveEndpointId,
    mentionedEndpointIds,
  ]);

  const activeContextEndpoint =
    rawActiveEndpointId && rawActiveEndpointId !== dismissedActiveEndpointId
      ? specEndpoints.find((ep) => ep.id === rawActiveEndpointId)
      : undefined;

  const mentionedEndpoints = mentionedEndpointIds
    .map((id) => specEndpoints.find((ep) => ep.id === id))
    .filter((ep): ep is Endpoint => Boolean(ep));

  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim().toLowerCase();
    const pool = specEndpoints.filter(
      (ep) => !mentionedEndpointIds.includes(ep.id),
    );
    const filtered = q
      ? pool.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            (ep.summary?.toLowerCase().includes(q) ?? false) ||
            ep.method.toLowerCase().includes(q),
        )
      : pool;
    return filtered.slice(0, 20);
  }, [mentionQuery, specEndpoints, mentionedEndpointIds]);

  const mentionClampedIndex = Math.min(
    mentionActiveIndex,
    Math.max(mentionResults.length - 1, 0),
  );

  const closeMentionDropdown = useCallback(() => {
    setMentionQuery(null);
    setMentionTriggerStart(null);
    setMentionActiveIndex(0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputVal(value);

    const cursor = e.target.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const hashIndex = uptoCursor.lastIndexOf("#");

    if (hashIndex === -1) {
      closeMentionDropdown();
      return;
    }

    const between = uptoCursor.slice(hashIndex + 1, cursor);
    if (/\s/.test(between)) {
      closeMentionDropdown();
      return;
    }

    setMentionTriggerStart(hashIndex);
    setMentionQuery(between);
    setMentionActiveIndex(0);
  };

  const selectMention = (endpoint: Endpoint) => {
    if (mentionTriggerStart !== null) {
      const cursor = textareaRef.current?.selectionStart ?? inputVal.length;
      const before = inputVal.slice(0, mentionTriggerStart);
      const after = inputVal.slice(cursor);
      const nextVal = `${before}${after}`;
      setInputVal(nextVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const pos = before.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      });
    }
    setMentionedEndpointIds((prev) =>
      prev.includes(endpoint.id) ? prev : [...prev, endpoint.id],
    );
    closeMentionDropdown();
  };

  const removeMentionedEndpoint = (id: string) => {
    setMentionedEndpointIds((prev) => prev.filter((mid) => mid !== id));
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Fetch models from backend
  useEffect(() => {
    if (!assistantOpen) return;
    unwrap<LlmModelDto[]>(api.get("/assistant/models"))
      .then((data) => {
        if (data && data.length > 0) {
          setModels(data);
          setSelectedModel((prev) =>
            data.some((m) => m.id === prev) ? prev : data[0].id,
          );
        }
      })
      .catch(() => {
        // use fallback models
      });
  }, [assistantOpen]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await unwrap<ChatSessionDto[]>(api.get("/assistant/sessions"));
      if (data) {
        setSessions(
          data.map((s) => ({
            id: s.id,
            title: s.title || "Untitled Chat",
            updatedAt: formatTimeAgo(s.updated_date || s.created_date),
          })),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch sessions from backend
  useEffect(() => {
    if (!assistantOpen) return;
    let mounted = true;
    unwrap<ChatSessionDto[]>(api.get("/assistant/sessions"))
      .then((data) => {
        if (mounted && data) {
          setSessions(
            data.map((s) => ({
              id: s.id,
              title: s.title || "Untitled Chat",
              updatedAt: formatTimeAgo(s.updated_date || s.created_date),
            })),
          );
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      mounted = false;
    };
  }, [assistantOpen]);

  const selectOptions: SelectOption[] = models.map((m) => ({
    value: m.id,
    label: m.label,
    description: m.provider,
  }));

  const currentModelObj =
    models.find((m) => m.id === selectedModel) ||
    models[0] ||
    FALLBACK_MODELS[0];

  const handleSelectSession = async (session: ChatSessionItem) => {
    setActiveSessionId(session.id);
    setViewMode("chat");
    try {
      const fetchedMessages = await unwrap<ChatMessageDto[]>(
        api.get(`/assistant/sessions/${session.id}/messages`),
      );
      setMessages(
        fetchedMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          status: "idle",
          modelLabel: currentModelObj.label,
          modelProvider: currentModelObj.provider,
        })),
      );
    } catch {
      toast.error("Failed to load session history");
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setViewMode("chat");
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unwrap(api.delete(`/assistant/sessions/${id}`));
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        handleNewChat();
      }
      toast.success("Chat session deleted");
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendPrompt = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsgId = `u-${crypto.randomUUID()}`;
    const assistantMsgId = `a-${crypto.randomUUID()}`;

    const userMsg: ChatItem = {
      id: userMsgId,
      role: "user",
      content: text,
    };

    const pendingAssistantMsg: ChatItem = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      status: "loading",
      modelLabel: currentModelObj.label,
      modelProvider: currentModelObj.provider,
      toolEvents: [],
    };

    setMessages((prev) => [...prev, userMsg, pendingAssistantMsg]);
    setInputVal("");
    setMentionedEndpointIds([]);
    closeMentionDropdown();
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await chatStream(
        {
          message: text,
          threadId: activeSessionId || undefined,
          model: selectedModel,
          context: currentContext,
        },
        (evt) => {
          if (evt.type === "token") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: msg.content + evt.delta,
                      status: "streaming",
                    }
                  : msg,
              ),
            );
          } else if (evt.type === "tool_call_start") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      toolEvents: [
                        ...(msg.toolEvents || []),
                        {
                          id: `${evt.toolId}-${Date.now()}`,
                          name: evt.toolName,
                          args: evt.args,
                          status: "running",
                        },
                      ],
                    }
                  : msg,
              ),
            );
          } else if (evt.type === "tool_call_complete") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      toolEvents: (msg.toolEvents || []).map((t) =>
                        t.name === evt.toolName && t.status === "running"
                          ? {
                              ...t,
                              status: "completed",
                              resultSummary: evt.resultSummary,
                            }
                          : t,
                      ),
                    }
                  : msg,
              ),
            );
          } else if (evt.type === "tool_call_error") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      toolEvents: (msg.toolEvents || []).map((t) =>
                        t.name === evt.toolName && t.status === "running"
                          ? {
                              ...t,
                              status: "failed",
                              resultSummary: evt.resultSummary,
                            }
                          : t,
                      ),
                    }
                  : msg,
              ),
            );
          } else if (evt.type === "tool_confirmation_request") {
            setPendingConfirmations((prev) => [
              ...prev.filter((p) => p.confirmationId !== evt.confirmationId),
              {
                confirmationId: evt.confirmationId,
                toolId: evt.toolId,
                toolName: evt.toolName,
                args: evt.args,
                summary: evt.summary,
              },
            ]);
          } else if (evt.type === "ui_effect") {
            useAssistantEffectStore.getState().dispatchEffect(evt.effect);
          } else if (evt.type === "session_info") {
            setActiveSessionId(evt.threadId);
            loadSessions();
          } else if (evt.type === "done") {
            setActiveSessionId(evt.threadId);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: evt.fullReply || msg.content,
                      status: "idle",
                    }
                  : msg,
              ),
            );
            loadSessions();
          } else if (evt.type === "error") {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      status: "error",
                      errorMessage: evt.message,
                    }
                  : msg,
              ),
            );
          }
        },
        abortController.signal,
      );
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Error generating response";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                status: "error",
                errorMessage: errMsg,
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (
    confirmationId: string,
    approved: boolean,
  ) => {
    setPendingConfirmations((prev) =>
      prev.map((p) =>
        p.confirmationId === confirmationId ? { ...p, loading: true } : p,
      ),
    );

    try {
      await confirmAssistantTool(confirmationId, approved);
      setPendingConfirmations((prev) =>
        prev.filter((p) => p.confirmationId !== confirmationId),
      );
      if (approved) {
        toast.success("Aksi disetujui");
      } else {
        toast("Aksi dibatalkan", { icon: "🚫" });
      }
    } catch {
      toast.error("Gagal mengirim konfirmasi");
      setPendingConfirmations((prev) =>
        prev.map((p) =>
          p.confirmationId === confirmationId ? { ...p, loading: false } : p,
        ),
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionActiveIndex((i) =>
          mentionResults.length ? (i + 1) % mentionResults.length : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionActiveIndex((i) =>
          mentionResults.length
            ? (i - 1 + mentionResults.length) % mentionResults.length
            : 0,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (mentionResults[mentionClampedIndex]) {
          e.preventDefault();
          selectMention(mentionResults[mentionClampedIndex]);
          return;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeMentionDropdown();
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(inputVal);
    }
  };

  if (!assistantOpen) return null;
  const hasMessages = messages.length > 0;

  return (
    <aside
      aria-label="AI Assistant Panel"
      className="relative flex h-full w-110 shrink-0 flex-col border-l border-border bg-base"
    >
      {/* ── Ambient Glow Background ─────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* ── Top Header (56px) ───────────────────────────────────────── */}
      <div className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3.5">
        {viewMode === "sessions" ? (
          /* Sessions View Header */
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Back to chat"
                onClick={() => setViewMode("chat")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold tracking-tight text-text-primary">
                Chat History
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNewChat}
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </Button>
          </div>
        ) : (
          /* Main Chat View Header */
          <>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {/* History / Sessions toggle button */}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Chat sessions"
                title="Chat History"
                onClick={() => {
                  loadSessions();
                  setViewMode("sessions");
                }}
              >
                <History className="h-4 w-4 text-text-secondary hover:text-text-primary" />
              </Button>

              <div className="w-56">
                <Select
                  options={selectOptions}
                  value={selectedModel}
                  onChange={(val) => setSelectedModel(val)}
                  size="sm"
                  searchable={false}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {hasMessages && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label="New chat"
                  title="New chat"
                  onClick={handleNewChat}
                >
                  <Plus className="h-4 w-4 text-text-secondary" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Close"
                title="Close panel"
                onClick={() => setAssistantOpen(false)}
              >
                <X className="h-4 w-4 text-text-secondary" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Body: Session List View OR Chat Message View ─────────────── */}
      {viewMode === "sessions" ? (
        /* Sessions History List */
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-4 space-y-2">
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-text-muted">
            <span>Recent Sessions ({sessions.length})</span>
          </div>

          {sessions.length === 0 ? (
            <div className="my-auto flex flex-col items-center text-center py-10">
              <MessageSquare className="h-8 w-8 text-text-muted/40 mb-2" />
              <p className="text-sm font-medium text-text-muted">
                Belum ada riwayat percakapan
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleNewChat}
                className="mt-4"
              >
                Mulai Chat Baru
              </Button>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = activeSessionId === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`group relative flex cursor-pointer items-center justify-between border p-3 text-xs transition-all ${
                    isActive
                      ? "border-primary/60 bg-primary/10 text-text-primary"
                      : "border-border/80 bg-surface/70 hover:border-border hover:bg-card text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <div className="flex flex-1 items-start gap-2.5 min-w-0 pr-2">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? "text-primary" : "text-text-muted"}`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold text-[13px] text-text-primary">
                        {session.title}
                      </span>
                      <span className="text-[11px] text-text-muted mt-0.5">
                        {session.updatedAt}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label="Delete session"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-danger h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Chat View */
        <>
          <div
            ref={scrollContainerRef}
            className="relative z-10 flex flex-1 flex-col overflow-y-auto px-5 py-6"
          >
            {!hasMessages ? (
              /* Empty / Welcome State */
              <div className="my-auto flex flex-col items-center text-center">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary font-heading">
                  Where should we start?
                </h2>
                <p className="mb-8 max-w-70 text-xs text-text-secondary leading-relaxed">
                  Ask anything about your API spec, generate endpoints, design
                  DTO schemas, or audit security.
                </p>

                {/* Quick Suggestions List */}
                <div className="w-full space-y-2.5 text-left">
                  {SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendPrompt(item.prompt)}
                      className="group flex w-full items-center gap-3 border border-border/80 bg-surface/70 p-3 text-xs text-text-secondary transition-all hover:border-primary/50 hover:bg-card hover:text-text-primary"
                    >
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Active Chat Thread */
              <div className="space-y-6">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id} className="flex flex-col">
                      {isUser ? (
                        /* User Message: Dark clean pill on the right */
                        <div className="flex justify-end">
                          <div className="max-w-[85%] bg-card border border-border px-4 py-2.5 text-[14px] font-medium text-text-primary shadow-xs">
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ) : (
                        /* Dedicated Assistant Response View (Markdown, Tables, CodeBlocks) */
                        <AssistantResponseView
                          id={msg.id}
                          content={msg.content}
                          status={msg.status}
                          errorMessage={msg.errorMessage}
                          modelLabel={msg.modelLabel}
                          modelProvider={msg.modelProvider}
                          toolEvents={msg.toolEvents}
                          onRegenerate={() =>
                            handleSendPrompt(
                              messages[messages.length - 2]?.content ||
                                "Regenerate",
                            )
                          }
                        />
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            )}
          </div>

          {/* ── Input Box Footer ──────────────────────────────────────── */}
          <div className="relative z-10 p-4 pt-2 space-y-2">
            {/* ── Mutation Confirmation Cards (Human in the loop) ────── */}
            {pendingConfirmations.length > 0 && (
              <div className="space-y-2">
                {pendingConfirmations.map((conf) => (
                  <div
                    key={conf.confirmationId}
                    className="border border-warning/50 bg-card p-3 shadow-md transition-all animate-fadeIn"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-warning">
                            Konfirmasi Aksi
                          </span>
                          <span className="font-mono text-[10px] text-text-muted">
                            {formatToolLabel(conf.toolName)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-text-primary leading-snug">
                          {conf.summary}
                        </p>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={conf.loading}
                            onClick={() =>
                              handleConfirmAction(conf.confirmationId, false)
                            }
                          >
                            Batalkan
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            loading={conf.loading}
                            onClick={() =>
                              handleConfirmAction(conf.confirmationId, true)
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                            Setujui & Jalankan
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(activeContextEndpoint || mentionedEndpoints.length > 0) && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {activeContextEndpoint && (
                  <span className="flex items-center gap-1.5 border border-primary/40 bg-primary/10 py-1 pl-2 pr-1 text-[10.5px] text-primary">
                    <Hash className="h-3 w-3 shrink-0" />
                    <span className="font-mono font-semibold">
                      {activeContextEndpoint.method}
                    </span>
                    <span className="max-w-40 truncate font-mono">
                      {activeContextEndpoint.path}
                    </span>
                    <span className="text-primary/70">Active</span>
                    <button
                      type="button"
                      aria-label="Remove active endpoint context"
                      onClick={() =>
                        setDismissedActiveEndpointId(activeContextEndpoint.id)
                      }
                      className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {mentionedEndpoints.map((ep) => (
                  <span
                    key={ep.id}
                    className="flex items-center gap-1.5 border border-border bg-overlay py-1 pl-2 pr-1 text-[10.5px] text-text-secondary"
                  >
                    <FileJson2 className="h-3 w-3 shrink-0" />
                    <span className="font-mono font-semibold">
                      {ep.method}
                    </span>
                    <span className="max-w-40 truncate font-mono">
                      {ep.path}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${ep.path} mention`}
                      onClick={() => removeMentionedEndpoint(ep.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-border/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative border border-border bg-surface focus-within:border-primary transition-colors shadow-sm">
              {mentionQuery !== null && (
                <EndpointMentionDropdown
                  endpoints={mentionResults}
                  activeIndex={mentionClampedIndex}
                  onSelect={selectMention}
                  onHoverIndex={setMentionActiveIndex}
                />
              )}
              <textarea
                ref={textareaRef}
                value={inputVal}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  window.setTimeout(() => closeMentionDropdown(), 150);
                }}
                placeholder="Ask Studio Assistant... (type # to mention an endpoint)"
                rows={hasMessages ? 2 : 3}
                className="w-full resize-none bg-transparent p-3 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none"
              />

              <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-overlay">
                <span className="text-[11px] text-text-muted">
                  Shift + Enter for new line
                </span>

                <Button
                  variant="primary"
                  size="sm"
                  iconOnly
                  aria-label="Send message"
                  disabled={!inputVal.trim() || isLoading}
                  loading={isLoading}
                  onClick={() => handleSendPrompt(inputVal)}
                  className="h-7 w-7 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
