import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CornerDownLeft,
  History,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { Button, Select, type SelectOption } from '../ui';
import { AssistantResponseView, type ToolCallEvent } from './AssistantResponseView';

// Model list matching server constants
const DUMMY_MODELS = [
  { id: 'cx/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI' },
  { id: 'cx/gpt-5.6-terra', label: 'GPT-5.6 Terra', provider: 'OpenAI' },
  { id: 'ag/gemini-3.7-flash-high', label: 'Gemini 3.7 Flash High', provider: 'Google' },
  { id: 'ag/gemini-3.7-flash-low', label: 'Gemini 3.7 Flash Low', provider: 'Google' },
  { id: 'ag/gemini-3.6-flash-high', label: 'Gemini 3.6 Flash High', provider: 'Google' },
  { id: 'oc/big-pickle', label: 'Big Pickle', provider: 'OpenCode' },
  { id: 'oc/mimo-v2.5-free', label: 'MiMo v2.5', provider: 'Xiaomi' },
  { id: 'oc/laguna-s-2.1-free', label: 'Laguna S 2.1', provider: 'Poolside' },
];

const SELECT_OPTIONS: SelectOption[] = DUMMY_MODELS.map((m) => ({
  value: m.id,
  label: m.label,
  description: m.provider,
}));

const SUGGESTIONS = [
  { label: 'Check upcoming API breaking changes', prompt: 'Periksa potensi breaking changes pada endpoint saya' },
  { label: 'Plan a product launch API contract', prompt: 'Buatkan API contract rencana rilis fitur baru' },
  { label: 'Explain how OpenAPI schema works', prompt: 'Jelaskan cara kerja skema OpenAPI 3.0 dan relasinya' },
];

export interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
  messagesCount: number;
}

interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'idle' | 'loading' | 'streaming' | 'error';
  modelLabel?: string;
  modelProvider?: string;
  toolEvents?: ToolCallEvent[];
}

const INITIAL_SESSIONS: ChatSessionItem[] = [
  {
    id: 's-1',
    title: 'Desain CRUD User Management & Roles',
    updatedAt: '10m ago',
    messagesCount: 4,
  },
  {
    id: 's-2',
    title: 'Audit Keamanan Bearer Token & CORS',
    updatedAt: '2h ago',
    messagesCount: 6,
  },
  {
    id: 's-3',
    title: 'Skema OpenAPI DTO Order & Payment',
    updatedAt: 'Yesterday',
    messagesCount: 2,
  },
];

export function AssistantDrawer() {
  const { assistantOpen, setAssistantOpen } = useUiStore();
  const [viewMode, setViewMode] = useState<'chat' | 'sessions'>('chat');
  const [sessions, setSessions] = useState<ChatSessionItem[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState(DUMMY_MODELS[2].id);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [inputVal, setInputVal] = useState('');

  if (!assistantOpen) return null;

  const currentModelObj = DUMMY_MODELS.find((m) => m.id === selectedModel) || DUMMY_MODELS[0];

  const handleSelectSession = (session: ChatSessionItem) => {
    setActiveSessionId(session.id);
    setViewMode('chat');
    // Load dummy conversation for that session
    setMessages([
      {
        id: '1',
        role: 'user',
        content: `Buka riwayat percakapan: ${session.title}`,
      },
      {
        id: '2',
        role: 'assistant',
        content: `Melanjutkan sesi **${session.title}** menggunakan model **${currentModelObj.label}**. Silakan lanjutkan pertanyaan Anda!`,
        modelLabel: currentModelObj.label,
        modelProvider: currentModelObj.provider,
      },
    ]);
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setViewMode('chat');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      handleNewChat();
    }
  };

  const handleSendPrompt = (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    const userMsg: ChatItem = {
      id: userMsgId,
      role: 'user',
      content: text,
    };

    // If starting a fresh session, add to sessions list
    if (!activeSessionId && messages.length === 0) {
      const newSession: ChatSessionItem = {
        id: `s-${Date.now()}`,
        title: text.length > 38 ? `${text.slice(0, 38)}…` : text,
        updatedAt: 'Just now',
        messagesCount: 2,
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
    }

    const sampleAssistantReply =
      `Pong! Ready when you are.\n\n` +
      `Berikut adalah contoh ringkasan spesifikasi endpoint API Anda:\n\n` +
      `| Method | Path | Status | Auth |\n` +
      `| :--- | :--- | :--- | :--- |\n` +
      `| \`GET\` | \`/api/users\` | 200 OK | Bearer JWT |\n` +
      `| \`POST\` | \`/api/users\` | 201 Created | Bearer JWT |\n` +
      `| \`DELETE\` | \`/api/users/:id\` | 204 No Content | Admin Only |\n\n` +
      `\`\`\`json\n` +
      `{\n` +
      `  "status": "success",\n` +
      `  "model": "${currentModelObj.label}",\n` +
      `  "provider": "${currentModelObj.provider}"\n` +
      `}\n` +
      `\`\`\``;

    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: sampleAssistantReply,
        status: 'idle',
        modelLabel: currentModelObj.label,
        modelProvider: currentModelObj.provider,
        toolEvents: [
          {
            id: 't-1',
            name: 'list_projects',
            status: 'completed',
            resultSummary: 'Loaded 4 projects',
          },
          {
            id: 't-2',
            name: 'get_endpoints_by_project',
            status: 'completed',
            resultSummary: 'Inspected 12 endpoints',
          },
        ],
      },
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt(inputVal);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <aside
      aria-label="AI Assistant Panel"
      className="relative flex h-full w-[440px] shrink-0 flex-col border-l border-border bg-base"
    >
      {/* ── Ambient Glow Background ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* ── Top Header (56px) ───────────────────────────────────────── */}
      <div className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3.5">
        {viewMode === 'sessions' ? (
          /* Sessions View Header */
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Back to chat"
                onClick={() => setViewMode('chat')}
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
                onClick={() => setViewMode('sessions')}
              >
                <History className="h-4 w-4 text-text-secondary hover:text-text-primary" />
              </Button>

              <div className="w-56">
                <Select
                  options={SELECT_OPTIONS}
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
      {viewMode === 'sessions' ? (
        /* Sessions History List */
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-4 space-y-2">
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-text-muted">
            <span>Recent Sessions ({sessions.length})</span>
          </div>

          {sessions.length === 0 ? (
            <div className="my-auto flex flex-col items-center text-center py-10">
              <MessageSquare className="h-8 w-8 text-text-muted/40 mb-2" />
              <p className="text-sm font-medium text-text-muted">Belum ada riwayat percakapan</p>
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
                      ? 'border-primary/60 bg-primary/10 text-text-primary'
                      : 'border-border/80 bg-surface/70 hover:border-border hover:bg-card text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="flex flex-1 items-start gap-2.5 min-w-0 pr-2">
                    <MessageSquare className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-primary' : 'text-text-muted'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-semibold text-[13px] text-text-primary">
                        {session.title}
                      </span>
                      <span className="text-[11px] text-text-muted mt-0.5">
                        {session.updatedAt} · {session.messagesCount} messages
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
          <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-5 py-6">
            {!hasMessages ? (
              /* Empty / Welcome State */
              <div className="my-auto flex flex-col items-center text-center">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-text-primary font-heading">
                  Where should we start?
                </h2>
                <p className="mb-8 max-w-70 text-xs text-text-secondary leading-relaxed">
                  Ask anything about your API spec, generate endpoints, design DTO schemas, or audit security.
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
                  const isUser = msg.role === 'user';
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
                        /* Dedicated Assistant Response View (Markdown, Tables, CodeBlocks, Tool Events) */
                        <AssistantResponseView
                          id={msg.id}
                          content={msg.content}
                          status={msg.status}
                          modelLabel={msg.modelLabel}
                          modelProvider={msg.modelProvider}
                          toolEvents={msg.toolEvents}
                          onRegenerate={() => handleSendPrompt(messages[messages.length - 2]?.content || 'Regenerate')}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Input Box Footer ──────────────────────────────────────── */}
          <div className="relative z-10 p-4 pt-2">
            <div className="border border-border bg-surface focus-within:border-primary transition-colors shadow-sm">
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Studio Assistant..."
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
                  disabled={!inputVal.trim()}
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
