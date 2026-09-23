import initSqlJs, { type Database } from 'sql.js'
import { SessionRepository } from '../db/session-repository'
import type { BelUiRuntime, CreateSessionInput, SessionDetail, SessionEvent, SessionSummary } from '../shared/types'

const STORAGE_KEY = 'bel.session-db.v1'
type Listener = (event: SessionEvent) => void

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function decode(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function openStoredDatabase(SQL: typeof import('sql.js')): Database {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === null ? new SQL.Database() : new SQL.Database(decode(stored))
}

function persistDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, encode(db.export()))
}

const notify = (listeners: Map<string, Set<Listener>>, sessionId: string, event: SessionEvent): void => {
  for (const listener of [...(listeners.get(sessionId) ?? [])]) {
    try { listener(event) } catch { /* subscriber failures must not break runtime writes */ }
  }
}

function seed(repository: SessionRepository): void {
  if (repository.listSessions().length > 0) return
  const session = repository.createSession({
    title: 'Explore the Bel runtime',
    workspacePath: '.',
    provider: 'Mock provider',
    model: 'development',
  })
  repository.addMessage(session.id, 'user', 'Show me the current project structure.')
  repository.addMessage(session.id, 'assistant', 'The runtime is ready to inspect the workspace. The real provider can be connected next.')
  repository.addEvent(session.id, 'session.created', 'Seeded development session')
}

export interface BrowserRuntimeHandle extends BelUiRuntime {
  close(): void
}

/** Browser-safe session runtime. SQLite is serialized to localStorage until a Node host is added. */
export async function createBrowserRuntime(): Promise<BrowserRuntimeHandle> {
  const SQL = await initSqlJs({ locateFile: file => `/node_modules/sql.js/dist/${file}` })
  const db = openStoredDatabase(SQL)
  const repository = new SessionRepository(db)
  seed(repository)
  persistDatabase(db)
  const listeners = new Map<string, Set<Listener>>()

  const saveEvent = (sessionId: string, type: string, message: string, metadata?: Record<string, unknown>): SessionEvent => {
    const event = repository.addEvent(sessionId, type, message, metadata)
    persistDatabase(db)
    notify(listeners, sessionId, event)
    return event
  }

  return {
    async listSessions(): Promise<SessionSummary[]> {
      return repository.listSessions()
    },
    async getSession(id: string): Promise<SessionDetail | null> {
      return repository.getSession(id)
    },
    async createSession(input?: CreateSessionInput): Promise<SessionSummary> {
      const session = repository.createSession(input)
      persistDatabase(db)
      saveEvent(session.id, 'session.created', `Created ${session.title}`)
      return session
    },
    async sendMessage(sessionId: string, content: string): Promise<void> {
      if (repository.getSession(sessionId) === null) throw new Error(`Session not found: ${sessionId}`)
      repository.addMessage(sessionId, 'user', content)
      repository.updateSessionStatus(sessionId, 'running')
      persistDatabase(db)
      saveEvent(sessionId, 'message.created', 'User message added')
      await new Promise(resolve => window.setTimeout(resolve, 250))
      repository.addMessage(sessionId, 'assistant', `I received: ${content}\n\nThis browser runtime is connected to SQLite storage. The real agent loop will replace this development response.`)
      repository.updateSessionStatus(sessionId, 'completed')
      persistDatabase(db)
      saveEvent(sessionId, 'message.created', 'Development assistant response added')
      saveEvent(sessionId, 'session.completed', 'Development turn completed')
    },
    async stopSession(sessionId: string): Promise<void> {
      repository.updateSessionStatus(sessionId, 'idle')
      persistDatabase(db)
      saveEvent(sessionId, 'session.stopped', 'Session stopped')
    },
    subscribeToSession(sessionId: string, listener: Listener): () => void {
      const set = listeners.get(sessionId) ?? new Set<Listener>()
      set.add(listener)
      listeners.set(sessionId, set)
      return () => {
        set.delete(listener)
        if (set.size === 0) listeners.delete(sessionId)
      }
    },
    close(): void {
      persistDatabase(db)
      db.close()
      listeners.clear()
    },
  }
}
