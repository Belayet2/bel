import { afterEach, describe, expect, it, vi } from 'vitest'
import { belRuntime } from './sqlite-runtime'

const sessionIds: string[] = []

afterEach(() => {
  localStorage.clear()
  for (const id of sessionIds.splice(0)) {
    // no-op: cleanup is handled by reset of browser storage in tests
  }
})

describe('sqlite runtime', () => {
  it('creates and reads session records', async () => {
    const session = await belRuntime.createSession({ title: 'SQLite session', workspacePath: '~/workspace/test' })
    sessionIds.push(session.id)

    const loaded = await belRuntime.getSession(session.id)

    expect(loaded?.title).toBe('SQLite session')
    expect(loaded?.workspacePath).toBe('~/workspace/test')
    expect(loaded?.status).toBe('idle')
  })

  it('persists sent messages and emits subscription events', async () => {
    const session = await belRuntime.createSession({ title: 'Message test' })
    sessionIds.push(session.id)

    const listener = vi.fn()
    const unsubscribe = belRuntime.subscribeToSession(session.id, listener)

    await belRuntime.sendMessage(session.id, 'hello bel')

    const loaded = await belRuntime.getSession(session.id)
    expect(loaded?.messages.some(message => message.content.includes('hello bel'))).toBe(true)
    expect(listener).toHaveBeenCalled()

    unsubscribe()
  })

  it('stops a session and stores the stop event', async () => {
    const session = await belRuntime.createSession({ title: 'Stop test' })
    sessionIds.push(session.id)

    await belRuntime.stopSession(session.id)

    const loaded = await belRuntime.getSession(session.id)
    expect(loaded?.status).toBe('idle')
    expect(loaded?.events.some(event => event.type === 'session.stopped')).toBe(true)
  })
})
