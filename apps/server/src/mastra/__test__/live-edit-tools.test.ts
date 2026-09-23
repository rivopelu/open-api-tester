import { RequestContext } from '@mastra/core/request-context'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'
import { assistantTools } from '../tools'

const plan = {
  projectId: 'p1',
  endpointId: 'e1',
  ops: [{ kind: 'docs', value: '# Hello' }],
  patch: { specData: { description: '# Hello' } },
}

const mocks = vi.hoisted(() => ({
  execute: vi.fn(async () => ({ persisted: 'direct' })),
  planLiveEdit: vi.fn(),
  persistLivePatch: vi.fn(async () => ({ persisted: 'fallback' })),
}))

vi.mock('../../app/assistant/tools/definitions/domain-tools', () => ({
  domainTools: [
    {
      name: 'update_endpoint_docs',
      description: 'test tool',
      inputSchema: z.object({ endpointId: z.string() }),
      requiresConfirmation: true,
      execute: mocks.execute,
      planLiveEdit: mocks.planLiveEdit,
    },
  ],
  persistLivePatch: mocks.persistLivePatch,
}))

const tool = assistantTools.update_endpoint_docs

function context(liveEdit: boolean, agent: Record<string, unknown> = {}) {
  const requestContext = new RequestContext()
  requestContext.set('accountId', 'acc-1')
  if (liveEdit) requestContext.set('liveEdit', true)
  const suspend = vi.fn(async (_payload: unknown, _options?: unknown) => undefined)
  // Agent runs expose suspend/resume under `agent`; MCP calls have no agent context.
  return {
    requestContext,
    suspend,
    agent: liveEdit
      ? { agentId: 'a', toolCallId: 'c1', messages: [], suspend, ...agent }
      : undefined,
  }
}

const run = (ctx: ReturnType<typeof context>) =>
  (tool.execute as (input: unknown, ctx: unknown) => Promise<unknown>)({ endpointId: 'e1' }, ctx)

describe('live edit tool wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.planLiveEdit.mockResolvedValue(plan)
  })

  test('persists directly when the request is not live (MCP / non-streaming chat)', async () => {
    const ctx = context(false)
    await expect(run(ctx)).resolves.toEqual({ persisted: 'direct' })
    expect(mocks.execute).toHaveBeenCalledWith(
      { endpointId: 'e1' },
      expect.objectContaining({ accountId: 'acc-1' }),
    )
    expect(ctx.suspend).not.toHaveBeenCalled()
  })

  test('suspends with the plan instead of persisting in live mode', async () => {
    const ctx = context(true)
    await run(ctx)
    expect(mocks.execute).not.toHaveBeenCalled()
    expect(ctx.suspend).toHaveBeenCalledTimes(1)
    expect(ctx.suspend.mock.calls[0]?.[0]).toEqual({
      plan: { ...plan, tool: 'update_endpoint_docs', editId: expect.any(String) },
    })
  })

  test('returns the client-saved endpoint on resume', async () => {
    const endpoint = { id: 'e1', method: 'GET', path: '/users' }
    const ctx = context(true, {
      resumeData: { outcome: 'saved', endpoint },
      suspendPayload: { plan },
    })
    await expect(run(ctx)).resolves.toEqual({ ...endpoint, liveEdit: 'saved' })
    expect(mocks.persistLivePatch).not.toHaveBeenCalled()
  })

  test('persists the plan server-side on fallback', async () => {
    const ctx = context(true, { resumeData: { outcome: 'fallback' }, suspendPayload: { plan } })
    await expect(run(ctx)).resolves.toEqual({ persisted: 'fallback' })
    expect(mocks.persistLivePatch).toHaveBeenCalledWith('e1', plan.patch)
  })

  test('surfaces a client save failure as a tool error', async () => {
    const ctx = context(true, {
      resumeData: { outcome: 'failed', error: 'Conflict' },
      suspendPayload: { plan },
    })
    await expect(run(ctx)).rejects.toThrow('Conflict')
  })
})
