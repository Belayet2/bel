import { describe, expect, it, vi } from 'vitest'
import { DurableAgentRunner, type AgentSessionStore } from './durable-runner'

function store(): AgentSessionStore & { events: string[]; messages: string[]; statuses: string[] } {
  return {
    events: [], messages: [], statuses: [],
    getSession: () => ({ id: 'session-1', status: 'idle' }),
    addMessage: (_id, _role, content) => { storeValue.messages.push(content); return { id: 'message-1' } },
    updateSessionStatus: (_id, status) => { storeValue.statuses.push(status) },
    addToolCall: () => ({ id: 'tool-1' }),
    addEvent: (_id, type) => { storeValue.events.push(type); return { id: type, type, timestamp: new Date().toISOString(), message: type } },
  }
  const storeValue = {} as ReturnType<typeof store>
}

describe('DurableAgentRunner', () => {
  it('persists the turn lifecycle and final assistant message', async () => {
    const persistence = store()
    const loop = { run: vi.fn().mockResolvedValue({ finalText: 'done', toolResults: [] }) } as never
    const result = await new DurableAgentRunner(loop, persistence).run('session-1', 'inspect the project')

    expect(result.finalText).toBe('done')
    expect(persistence.messages).toEqual(['inspect the project', 'done'])
    expect(persistence.events).toEqual(['turn.started', 'turn.completed'])
    expect(persistence.statuses).toEqual(['running', 'completed'])
  })

  it('records failure and marks the session failed', async () => {
    const persistence = store()
    const loop = { run: vi.fn().mockRejectedValue(new Error('provider unavailable')) } as never

    await expect(new DurableAgentRunner(loop, persistence).run('session-1', 'hello')).rejects.toThrow('provider unavailable')
    expect(persistence.events).toContain('turn.failed')
    expect(persistence.statuses).toEqual(['running', 'failed'])
  })
})
