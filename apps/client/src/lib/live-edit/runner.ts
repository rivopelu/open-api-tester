import type { LiveEditOp, LiveEditOutcome, LiveEditPlan } from '@modern-api-studio/types';
import type { EndpointDto } from '../api';
import { getErrorMessage } from '../api';
import {
  useLiveEditStore,
  type EndpointFormAdapter,
  type ExamplesAdapter,
  type LiveEditField,
  type LiveEditTextField,
} from '../../store/useLiveEditStore';
import { initialBody } from './body';

const ADAPTER_TIMEOUT_MS = 8000;
const MAX_FIELD_MS = 1500;
const FRAME_MS = 16;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/** Polls until `get` returns a value (the adapter mounts after navigation / tab switch). */
async function waitFor<T>(get: () => T | null, timeoutMs = ADAPTER_TIMEOUT_MS): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = get();
    if (value) return value;
    await sleep(50);
  }
  return get();
}

/**
 * Types `to` into a field, starting from the part it shares with `from`
 * (so appending docs only types the new text). Caps each field at ~1.5s.
 */
async function typeText(from: string, to: string, set: (value: string) => void) {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) start += 1;
  if (start < from.length) set(to.slice(0, start));

  const remaining = to.length - start;
  if (remaining <= 0) {
    set(to);
    return;
  }
  const frames = Math.max(1, Math.min(Math.ceil(MAX_FIELD_MS / FRAME_MS), remaining));
  const step = Math.ceil(remaining / frames);
  for (let index = start + step; index < to.length; index += step) {
    set(to.slice(0, index));
    await sleep(FRAME_MS);
  }
  set(to);
}

function fieldOf(op: LiveEditOp): LiveEditField | null {
  switch (op.kind) {
    case 'method':
    case 'url':
    case 'summary':
    case 'body':
    case 'docs':
    case 'responses':
      return op.kind;
    case 'rows':
      return op.section === 'header' ? 'headers' : 'params';
    case 'example':
      return 'examples';
    case 'auth':
      return null;
  }
}

const currentForm = (endpointId: string) => {
  const adapter = useLiveEditStore.getState().formAdapter;
  return adapter?.endpointId === endpointId ? adapter : null;
};

const currentExamples = (endpointId: string) => {
  const adapter = useLiveEditStore.getState().examplesAdapter;
  return adapter?.endpointId === endpointId ? adapter : null;
};

async function typeInto(form: EndpointFormAdapter, field: LiveEditTextField, value: string) {
  await typeText(form.getText(field), value, (next) => form.setText(field, next));
}

async function playOp(op: LiveEditOp, plan: LiveEditPlan, form: EndpointFormAdapter) {
  switch (op.kind) {
    case 'method':
      form.setMethod(op.value);
      await sleep(250);
      return;
    case 'url':
      await typeInto(form, 'url', op.value);
      return;
    case 'summary':
      await typeInto(form, 'summary', op.value);
      return;
    case 'rows': {
      form.focusTab(op.section === 'header' ? 'headers' : 'params');
      await sleep(150);
      const typed: { key: string; value: string }[] = [];
      form.setRows(op.section, []);
      for (const row of op.rows) {
        const draft = { key: '', value: '' };
        typed.push(draft);
        await typeText('', row.key, (key) => {
          draft.key = key;
          form.setRows(op.section, [...typed]);
        });
        await typeText('', row.value, (value) => {
          draft.value = value;
          form.setRows(op.section, [...typed]);
        });
      }
      form.setRows(op.section, op.rows);
      return;
    }
    case 'body':
      form.focusTab('body');
      await sleep(150);
      await typeInto(form, 'body', initialBody(op.requestBody));
      return;
    case 'auth': {
      form.focusTab('authorization');
      await sleep(150);
      form.setAuth({ type: op.value.type });
      const typeAuth = async (key: 'bearerToken' | 'basicUser' | 'basicPass') => {
        const value = op.value[key];
        if (value) await typeText('', value, (next) => form.setAuth({ [key]: next }));
      };
      await typeAuth('bearerToken');
      await typeAuth('basicUser');
      await typeAuth('basicPass');
      return;
    }
    case 'docs':
      form.focusTab('docs');
      await sleep(150);
      await typeInto(form, 'docs', op.value);
      return;
    case 'responses':
    case 'example': {
      form.focusTab('examples');
      const examples: ExamplesAdapter | null = await waitFor(() => currentExamples(plan.endpointId));
      if (!examples) return;
      if (op.kind === 'responses') {
        examples.setResponses(op.value);
        await sleep(400);
        return;
      }
      examples.openExample(op);
      await sleep(150);
      await typeText('', op.example.value, (value) =>
        examples.setExampleValue(op.example.id, value),
      );
      return;
    }
  }
}

export interface LiveEditDeps {
  /** Open the plan's endpoint (project page + endpoint selection). */
  open: (plan: LiveEditPlan) => void;
  /** Persist the plan's final values from the client (same REST call as manual saves). */
  save: (plan: LiveEditPlan) => Promise<EndpointDto>;
}

/**
 * Plays the active session's plan into the real form, then saves it from the client.
 * The form stays locked (see `useLiveEditLocked`) until the store session ends.
 */
export async function runLiveEdit(deps: LiveEditDeps): Promise<LiveEditOutcome> {
  const store = useLiveEditStore.getState();
  const session = store.session;
  if (!session) return { outcome: 'fallback' };
  const { plan } = session;

  deps.open(plan);
  const opened = await waitFor(() => currentForm(plan.endpointId));
  if (!opened) return { outcome: 'fallback' };
  (document.activeElement as HTMLElement | null)?.blur?.();

  store.update({ phase: 'typing' });
  for (const [index, op] of plan.ops.entries()) {
    const form = currentForm(plan.endpointId);
    if (!form) return { outcome: 'fallback' };
    useLiveEditStore.getState().update({ opIndex: index, activeField: fieldOf(op) });
    await playOp(op, plan, form);
    await sleep(120);
  }

  useLiveEditStore.getState().update({ phase: 'saving', activeField: null });
  try {
    const saved = await deps.save(plan);
    currentForm(plan.endpointId)?.resyncAfterSave(true);
    return {
      outcome: 'saved',
      endpoint: {
        id: saved.id,
        method: saved.method,
        path: saved.path,
        summary: saved.summary ?? undefined,
      },
    };
  } catch (err) {
    currentForm(plan.endpointId)?.resyncAfterSave(false);
    return { outcome: 'failed', error: getErrorMessage(err, 'Failed to save the edit') };
  }
}
