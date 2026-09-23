import * as SQL from 'sql.js'
import { SessionRepository } from '../db/session-repository'
import type { BelUiRuntime, CreateSessionInput, SessionDetail, SessionEvent, SessionSummary } from '../shared/types'

const STORAGE_KEY = 'bel.sqlite.db'

function getDb(): SQL.Database {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const bytes = Uint8Array.from(atob(raw), char => char.charCodeAt(0))
      return new SQL.Database(bytes)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const db = new SQL.Database()
  localStorage.setItem(STORAGE_KEY, serializeDb(db))
  return db
}

function serializeDb(db: SQL.Database): string {
  const bytes = db.export()
  const binary = Array.from(bytes).map(value => String.fromCharCode(value)).join('')
  return btoa(binary)
}

function persistDb(db: SQL.Database): void {
  localStorage.setItem(STORAGE_KEY, serializeDb(db))
}

const listeners = new Map<string, Set<(event: SessionEvent) => void>>()

function emit(sessionId: string, event: SessionEvent): void {
  const set = listeners.get(sessionId)
  if (!set) return
  for (const listener of [...set]) {
    try {
      listener(event)
    } catch {
      // Intentionally ignore subscriber errors so one failing subscriber does not block others.
    }
  }
}

function createRuntime(): BelUiRuntime {
  const db = getDb()
  const repository = new SessionRepository(db)

  return {
    async listSessions(): Promise<SessionSummary[]> {
      const sessions = repository.listSessions()
      persistDb(db)
      return sessions
    },
    async getSession(id: string): Promise<SessionDetail | null> {
      const session = repository.getSession(id)
      persistDb(db)
      return session
    },
    async createSession(input?: CreateSessionInput): Promise<SessionSummary> {
      const session = repository.createSession(input)
      repository.addEvent(session.id, 'session.created', `Created session ${session.title}`, { sessionId: session.id })
      persistDb(db)
      emit(session.id, {
        id: session.id,
        type: 'session.created',
        timestamp: new Date().toISOString(),
        message: `Created session ${session.title}`,
      })
      return session
    },
    async sendMessage(sessionId: string, content: string): Promise<void> {
      const session = repository.getSession(sessionId)
      if (!session) return

      repository.addMessage(sessionId, 'user', content)
      repository.addEvent(sessionId, 'message.sent', 'User message added', { sessionId, content })
      repository.updateSessionStatus(sessionId, 'running')
      persistDb(db)
      emit(sessionId, {
        id: `${sessionId}-message-sent`,
        type: 'message.sent',
        timestamp: new Date().toISOString(),
        message: 'User message added',
      })

      window.setTimeout(() => {
        repository.addMessage(sessionId, 'assistant', `I received: ${content}. This is a mock response while the real LLM loop is still being built.`)
        repository.addEvent(sessionId, 'message.received', 'Assistant response generated', { sessionId, preview: content })
        repository.updateSessionStatus(sessionId, 'completed')
        persistDb(db)
        emit(sessionId, {
          id: `${sessionId}-message-received`,
          type: 'message.received',
          timestamp: new Date().toISOString(),
          message: 'Assistant response generated',
        })
      }, 350)
    },
    async stopSession(sessionId: string): Promise<void> {
      repository.updateSessionStatus(sessionId, 'idle')
      repository.addEvent(sessionId, 'session.stopped', 'Session stopped by user', { sessionId })
      persistDb(db)
      emit(sessionId, {
        id: `${sessionId}-session-stopped`,
        type: 'session.stopped',
        timestamp: new Date().toISOString(),
        message: 'Session stopped by user',
      })
    },
    subscribeToSession(sessionId: string, listener: (event: SessionEvent) => void): () => void {
      const set = listeners.get(sessionId) ?? new Set<(event: SessionEvent) => void>()
      set.add(listener)
      listeners.set(sessionId, set)

      return () => {
        const next = listeners.get(sessionId)
        if (!next) return
        next.delete(listener)
        if (next.size === 0) listeners.delete(sessionId)
      }
    },
  }
}

export const belRuntime = createRuntime()
