import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { InMemoryStore } from '@mastra/core/storage'
import { MastraLanguageModelV2Mock, simulateReadableStream } from '@mastra/core/test-utils/llm-mock'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'
import { assistantTools } from '../tools'

const plan = {
  projectId: 'p1',
  endpointId: 'e1',
  ops: [{ kind: 'docs', value: '# Users API' }],
  patch: { specData: { description: '# Users API' } },
}

const mocks = vi.hoisted(() => ({
  execute: vi.fn(async () => ({ persisted: 'direct' })),
  planLiveEdit: vi.fn(),
}))

vi.mock('../../app/assistant/tools/definitions/domain-tools', () => ({
  domainTools: [
    {
      name: 'update_endpoint_docs',
      description: 'Write endpoint docs',
      inputSchema: z.object({ endpointId: z.string() }),
      requiresConfirmation: true,
      execute: mocks.execute,
      planLiveEdit: mocks.planLiveEdit,
    },
  ],
  persistLivePatch: vi.fn(),
}))

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 }

/** First model call asks for the tool, every later call answers with text. */
function createModel() {
  let calls = 0
  return new MastraLanguageModelV2Mock({
    doStream: async () => {
      calls += 1
      const chunks: unknown[] =
        calls === 1
          ? [
              { type: 'stream-start', warnings: [] },
              {
                type: 'tool-call',
                toolCallId: 'call-1',
                toolName: 'update_endpoint_docs',
                input: JSON.stringify({ endpointId: 'e1' }),
              },
              { type: 'finish', finishReason: 'tool-calls', usage },
            ]
          : [
              { type: 'stream-start', warnings: [] },
              { type: 'text-start', id: 't1' },
              { type: 'text-delta', id: 't1', delta: 'Docs updated.' },
              { type: 'text-end', id: 't1' },
              { type: 'finish', finishReason: 'stop', usage },
            ]
      return { stream: simulateReadableStream({ chunks }) as never }
    },
  })
}

async function collect(output: { fullStream: AsyncIterable<{ type: string; payload?: unknown }> }) {
  const chunks: { type: string; payload?: any }[] = []
  for await (const chunk of output.fullStream) chunks.push(chunk)
  return chunks
}

describe('live edit flow through a real Mastra agent', () => {
  test('approve → suspend with plan → resume with client outcome', async () => {
    mocks.planLiveEdit.mockResolvedValue(plan)
    const agent = new Agent({
      id: 'live-edit-test',
      name: 'live-edit-test',
      instructions: 'test',
      model: createModel(),
      tools: assistantTools,
    })
    new Mastra({ agents: { agent }, storage: new InMemoryStore(), logger: false })

    const requestContext = new RequestContext()
    requestContext.set('accountId', 'acc-1')
    requestContext.set('liveEdit', true)

    // 1. The tool needs approval first (existing confirmation flow).
    const first = await agent.stream('write docs', { requestContext, maxSteps: 5 })
    const firstChunks = await collect(first)
    const approval = firstChunks.find((chunk) => chunk.type === 'tool-call-approval')
    expect(approval?.payload?.toolCallId).toBe('call-1')

    // 2. After approval the tool suspends with its plan instead of persisting.
    const approved = await agent.approveToolCall({
      runId: first.runId!,
      toolCallId: 'call-1',
      requestContext,
      maxSteps: 5,
    })
    const approvedChunks = await collect(approved)
    const suspended = approvedChunks.find((chunk) => chunk.type === 'tool-call-suspended')
    expect(suspended?.payload?.toolCallId).toBe('call-1')
    expect(suspended?.payload?.suspendPayload?.plan).toMatchObject({
      ...plan,
      tool: 'update_endpoint_docs',
    })
    expect(mocks.execute).not.toHaveBeenCalled()

    // 3. The client saved it; resuming returns that result and the model answers.
    const endpoint = { id: 'e1', method: 'GET', path: '/users' }
    const resumed = await agent.resumeStream(
      { outcome: 'saved', endpoint },
      { runId: first.runId!, toolCallId: 'call-1', requestContext, maxSteps: 5 },
    )
    const resumedChunks = await collect(resumed)
    const result = resumedChunks.find((chunk) => chunk.type === 'tool-result')
    expect(result?.payload?.result).toEqual({ ...endpoint, liveEdit: 'saved' })
    expect(resumedChunks.some((chunk) => chunk.type === 'text-delta')).toBe(true)
    expect(mocks.execute).not.toHaveBeenCalled()
  })
})
