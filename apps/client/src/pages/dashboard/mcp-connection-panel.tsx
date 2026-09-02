import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  KeyRound,
  PlugZap,
  RotateCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Typography } from "../../components/ui";
import { mcpRepository } from "../../repositories";
import { useAuthStore } from "../../store/useAuthStore";

type Client = "codex" | "claude" | "cursor";

const clientLabels: Record<Client, string> = {
  codex: "Codex",
  claude: "Claude Code",
  cursor: "Cursor",
};

export function McpConnectionPanel() {
  const accountId = useAuthStore((state) => state.user?.id);
  const tokenStorageKey = accountId
    ? `api-studio:mcp-token:${accountId}`
    : null;
  const [expanded, setExpanded] = useState(false);
  const [client, setClient] = useState<Client>("codex");
  const [token, setToken] = useState<string | null>(() => {
    if (!tokenStorageKey) return null;
    try {
      return localStorage.getItem(tokenStorageKey);
    } catch {
      return null;
    }
  });
  const [rotating, setRotating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const endpoint = "https://max-api-studio.bitech.id/api/mcp";

  useEffect(() => {
    if (!accountId) return;
    void mcpRepository
      .getToken()
      .then(({ token: storedToken }) => {
        setToken(storedToken);
        if (!tokenStorageKey) return;
        if (storedToken) localStorage.setItem(tokenStorageKey, storedToken);
        else localStorage.removeItem(tokenStorageKey);
      })
      .catch(() => {
        // Keep the locally cached token visible if the account request is temporarily unavailable.
      });
  }, [accountId, tokenStorageKey]);

  const config = useMemo(() => {
    const bearer = token || "TOKEN_BARU_ANDA";
    if (client === "codex") {
      return `codex mcp add max-api-studio --url ${endpoint} --bearer-token ${bearer}`;
    }
    if (client === "claude") {
      return `claude mcp add --transport http --scope project max-api-studio ${endpoint} --header "Authorization: Bearer ${bearer}"`;
    }
    return JSON.stringify(
      {
        mcpServers: {
          "max-api-studio": {
            url: endpoint,
            headers: { Authorization: `Bearer ${bearer}` },
          },
        },
      },
      null,
      2,
    );
  }, [client, endpoint, token]);

  const copy = async (name: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const rotate = async () => {
    if (token) return;
    setRotating(true);
    try {
      const result = await mcpRepository.rotateToken();
      setToken(result.token);
      if (tokenStorageKey) localStorage.setItem(tokenStorageKey, result.token);
      toast.success("MCP token generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate MCP token",
      );
    } finally {
      setRotating(false);
    }
  };

  const revoke = async () => {
    if (
      !window.confirm(
        "Revoke the MCP token? Connected clients will lose access immediately.",
      )
    )
      return;
    setRevoking(true);
    try {
      await mcpRepository.revokeToken();
      setToken(null);
      if (tokenStorageKey) localStorage.removeItem(tokenStorageKey);
      toast.success("MCP token revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revoke MCP token",
      );
    } finally {
      setRevoking(false);
    }
  };

  return (
    <section className="mb-8 border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-card"
        aria-expanded={expanded}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <PlugZap className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <Typography variant="heading-sm" as="span">
            Connect your AI client
          </Typography>
          <Typography
            variant="body-sm"
            tone="muted"
            as="span"
            className="mt-1 block"
          >
            Give your LLM read-only access to projects and endpoint
            specifications through MCP.
          </Typography>
        </span>
        <span className="hidden items-center gap-2 text-xs font-semibold text-success sm:flex">
          <ShieldCheck className="h-4 w-4" /> Read-only
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="grid border-t border-border lg:grid-cols-[minmax(250px,0.7fr)_minmax(0,1.3fr)]">
          <div className="border-b border-border p-5 lg:border-b-0 lg:border-r">
            <Typography variant="label" as="h3" className="mb-3">
              Connection credentials
            </Typography>
            <label className="mb-2 block text-xs font-semibold text-text-secondary">
              MCP endpoint
            </label>
            <div className="mb-5 flex h-9 border border-border bg-base">
              <code className="min-w-0 flex-1 truncate px-3 py-2 text-[11px] text-text-secondary">
                {endpoint}
              </code>
              <button
                type="button"
                onClick={() => void copy("endpoint", endpoint)}
                className="border-l border-border px-3 text-text-muted hover:text-primary"
                aria-label="Copy MCP endpoint"
              >
                {copied === "endpoint" ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">
                Access token
              </label>
              <span className="flex items-center gap-1 text-[10px] text-text-muted">
                <KeyRound className="h-3 w-3" /> stored on this browser
              </span>
            </div>
            <div className="mb-3 flex h-9 border border-border bg-base">
              <code className="min-w-0 flex-1 truncate px-3 py-2 text-[11px] text-text-secondary">
                {token || "Generate a token to connect"}
              </code>
              {token && (
                <button
                  type="button"
                  onClick={() => void copy("token", token)}
                  className="border-l border-border px-3 text-text-muted hover:text-primary"
                  aria-label="Copy MCP token"
                >
                  {copied === "token" ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={rotating}
                disabled={Boolean(token)}
                onClick={() => void rotate()}
              >
                <RotateCw className="h-3.5 w-3.5" />{" "}
                {token ? "Token generated" : "Generate token"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={revoking}
                disabled={!token}
                onClick={() => void revoke()}
              >
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-text-muted">
              This token remains visible on this browser. Revoke it before
              generating a replacement.
            </p>
          </div>

          <div className="min-w-0 p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <Typography variant="label" as="h3">
                Client setup
              </Typography>
              <div
                className="flex border border-border bg-base"
                role="tablist"
                aria-label="MCP clients"
              >
                {(Object.keys(clientLabels) as Client[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={client === id}
                    onClick={() => setClient(id)}
                    className={`border-r border-border px-3 py-1.5 text-[11px] font-semibold last:border-r-0 ${client === id ? "bg-primary/15 text-primary" : "text-text-muted hover:text-text-primary"}`}
                  >
                    {clientLabels[id]}
                  </button>
                ))}
              </div>
            </div>
            <p className="mb-3 text-xs text-text-muted">
              {client === "cursor"
                ? `Add this server to your ${clientLabels[client]} MCP configuration.`
                : "Run this command in your terminal."}
            </p>
            <div className="relative min-h-37.5 border border-border bg-base p-4 pr-12">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-6 text-text-secondary">
                {config}
              </pre>
              <button
                type="button"
                onClick={() => void copy("config", config)}
                className="absolute right-3 top-3 p-1.5 text-text-muted hover:text-primary"
                aria-label="Copy MCP configuration"
              >
                {copied === "config" ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-text-secondary sm:grid-cols-3">
              <span>
                <strong className="mr-2 font-mono text-primary">1</strong>
                Generate token
              </span>
              <span>
                <strong className="mr-2 font-mono text-primary">2</strong>Copy
                configuration
              </span>
              <span>
                <strong className="mr-2 font-mono text-primary">3</strong>
                Restart your client
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
