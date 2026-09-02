import { useState } from 'react';
import {
  Bot,
  ChevronDown,
  Maximize2,
  Minimize2,
  Plus,
  Send,
  Trash2,
  X,
  Code2,
  MessageSquare,
  Wand2,
} from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';
import { Button, Typography, Avatar } from '../ui';

// Mock models matching the server constants
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

interface MockMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const INITIAL_MESSAGES: MockMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      'Halo! Saya **Max AI Assistant**. Saya dapat membantu mendesain REST API, menghasilkan OpenAPI spec, membuat skema DTO, atau memvalidasi endpoint Anda. Ada yang bisa saya bantu?',
    time: 'Just now',
  },
];

export function AssistantDrawer() {
  const { assistantOpen, setAssistantOpen } = useUiStore();
  const [selectedModel, setSelectedModel] = useState(DUMMY_MODELS[2].id);
  const [messages, setMessages] = useState<MockMessage[]>(INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!assistantOpen) return null;

  const currentModelObj = DUMMY_MODELS.find((m) => m.id === selectedModel) || DUMMY_MODELS[0];

  const handleSend = () => {
    if (!inputVal.trim()) return;
    const userMsg: MockMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputVal.trim(),
      time: 'Just now',
    };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `*(Slicing Preview)* Menerima instruksi menggunakan model **${currentModelObj.label}** (${currentModelObj.provider}). Fitur chat & tool execution siap dihubungkan!`,
        time: 'Just now',
      },
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside
      aria-label="AI Assistant Panel"
      className={`flex h-full shrink-0 flex-col border-l border-border bg-surface transition-all duration-200 ${
        isExpanded ? 'w-[640px]' : 'w-[380px] lg:w-[420px]'
      }`}
    >
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-none bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-text-primary">AI Assistant</span>
              <span className="rounded-none bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                PRO
              </span>
            </div>
            <Typography variant="caption" tone="muted" className="line-clamp-1 text-[11px]">
              Powered by Mastra & LLM Router
            </Typography>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="New chat session"
            title="New Chat"
            onClick={() => setMessages(INITIAL_MESSAGES)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Expand width"
            title={isExpanded ? 'Collapse width' : 'Expand width'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden sm:inline-flex"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Close Assistant"
            title="Close Assistant"
            onClick={() => setAssistantOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Model Selector Bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border bg-base/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">Model:</span>
        </div>

        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="cursor-pointer appearance-none rounded-none border border-border bg-surface px-2.5 py-1 pr-7 text-xs font-medium text-text-primary focus:border-primary focus:outline-none"
          >
            {DUMMY_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.provider})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      {/* ── Quick Action Pills (Slicing Dummy) ─────────────────── */}
      <div className="flex gap-2 overflow-x-auto border-b border-border bg-base/20 px-4 py-2 text-xs no-scrollbar">
        <button
          type="button"
          onClick={() => setInputVal('Buatkan endpoint CRUD untuk User Management')}
          className="flex shrink-0 items-center gap-1.5 rounded-none border border-border bg-surface px-2.5 py-1 text-text-muted hover:border-primary/50 hover:text-text-primary"
        >
          <Wand2 className="h-3 w-3 text-primary" />
          Generate CRUD API
        </button>
        <button
          type="button"
          onClick={() => setInputVal('Generate OpenAPI schema untuk Entity Order & Invoice')}
          className="flex shrink-0 items-center gap-1.5 rounded-none border border-border bg-surface px-2.5 py-1 text-text-muted hover:border-primary/50 hover:text-text-primary"
        >
          <Code2 className="h-3 w-3 text-secondary" />
          Schema DTO
        </button>
        <button
          type="button"
          onClick={() => setInputVal('Analisis security spec OpenAPI saya saat ini')}
          className="flex shrink-0 items-center gap-1.5 rounded-none border border-border bg-surface px-2.5 py-1 text-text-muted hover:border-primary/50 hover:text-text-primary"
        >
          <MessageSquare className="h-3 w-3 text-warning" />
          Audit Security
        </button>
      </div>

      {/* ── Message Chat History Area ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-none text-xs ${
                  isUser
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-primary/20 text-primary border border-primary/30'
                }`}
              >
                {isUser ? 'U' : <Bot className="h-3.5 w-3.5" />}
              </div>

              <div
                className={`flex max-w-[85%] flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-none px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-base text-text-primary'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="mt-1 text-[10px] text-text-muted">{msg.time}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Input Box Footer ──────────────────────────────────── */}
      <div className="border-t border-border bg-surface p-3">
        <div className="relative rounded-none border border-border bg-base focus-within:border-primary">
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan sesuatu atau perintahkan AI untuk membuat API..."
            rows={3}
            className="w-full resize-none bg-transparent p-3 pr-10 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />

          <div className="flex items-center justify-between border-t border-border/50 px-2.5 py-1.5">
            <span className="text-[10px] text-text-muted">
              Shift + Enter for newline
            </span>

            <Button
              variant="primary"
              size="sm"
              iconOnly
              aria-label="Send message"
              disabled={!inputVal.trim()}
              onClick={handleSend}
              className="h-7 w-7"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
