import {
  KeyRound,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { useUiStore } from '../store/useUiStore';
import { useApiSpecStore } from '../store/useApiSpecStore';
import { Button, Select, Typography } from './ui';

export function RightSidebar() {
  const {
    rightPanelCollapsed,
    toggleRightPanel,
    testActiveServer,
    setTestActiveServer,
    testAuthToken,
    setTestAuthToken,
  } = useUiStore();
  const { spec } = useApiSpecStore();

  if (rightPanelCollapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-l border-border bg-surface py-2">
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Expand environment"
          onClick={toggleRightPanel}
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-l border-border bg-surface">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
          <SlidersHorizontal className="h-4 w-4 text-text-muted" aria-hidden="true" />
          Environment Variables
        </span>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Collapse environment"
          onClick={toggleRightPanel}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="scroll-y flex flex-1 flex-col gap-4 p-3">
        <section className="rounded-none border border-border bg-overlay p-3">
          <Typography variant="label" tone="muted" className="mb-3 uppercase tracking-wide">
            Environment
          </Typography>

          <div className="mb-3">
            <Select
              label="Active Server"
              size="sm"
              searchable={false}
              value={testActiveServer || (spec.servers[0]?.name ?? '')}
              onChange={setTestActiveServer}
              options={spec.servers.map((srv, i) => ({
                label: srv.name || `Server ${i + 1}`,
                value: srv.name || `Server ${i + 1}`,
              }))}
              placeholder={spec.servers.length === 0 ? 'No servers defined' : 'Select server…'}
            />
          </div>

          <div>
            <Typography as="label" htmlFor="auth-token" variant="label" className="flex items-center gap-1.5">
              <KeyRound className="h-3 w-3 text-text-muted" aria-hidden="true" />
              Auth Token
            </Typography>
            <textarea
              id="auth-token"
              className="input input-mono mt-1.5 min-h-20 resize-y"
              value={testAuthToken}
              onChange={(e) => setTestAuthToken(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1Ni..."
              spellCheck={false}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
