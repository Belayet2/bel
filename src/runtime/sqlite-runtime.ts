import type { Database } from 'sql.js'
import { initializeSchema } from './schema'
import type { CreateSessionInput, FileChange, Message, SessionDetail, SessionEvent, SessionSummary, ToolCall } from '../shared/types'

const generateId = (prefix: string): string => {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${String(random).replace(/[^a-zA-Z0-9-]/g, '')}`
}

export class SessionRepository {
  constructor(private readonly db: Database) {
    initializeSchema(this.db)
  }

  private readSessionSummary(row: Record<string, unknown>): SessionSummary {
    return {
      id: String(row.id),
      title: String(row.title),
      workspacePath: String(row.workspace_path),
      status: String(row.status) as SessionSummary['status'],
      updatedAt: String(row.updated_at),
      model: String(row.model),
      provider: String(row.provider),
    }
  }

  private readMessage(row: Record<string, unknown>): Message {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      role: String(row.role) as Message['role'],
      content: String(row.content),
      createdAt: String(row.created_at),
    }
  }

  private readToolCall(row: Record<string, unknown>): ToolCall {
    return {
      id: String(row.id),
      name: String(row.name),
      status: String(row.status) as ToolCall['status'],
      input: row.input_json ? JSON.parse(String(row.input_json)) : {},
      output: row.output_json ? String(row.output_json) : undefined,
      error: row.error ? String(row.error) : undefined,
      duration: row.started_at && row.finished_at ? `${new Date(String(row.finished_at)).getTime() - new Date(String(row.started_at)).getTime()}ms` : undefined,
      startedAt: row.started_at ? String(row.started_at) : undefined,
      finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    }
  }

  private readEvent(row: Record<string, unknown>): SessionEvent {
    return {
      id: String(row.id),
      type: String(row.type),
      timestamp: String(row.created_at),
      message: String(row.message),
      metadata: row.metadata_json ? JSON.parse(String(row.metadata_json)) : undefined,
    }
  }

  private readFileChange(row: Record<string, unknown>): FileChange {
    return {
      id: String(row.id),
      path: String(row.path),
      kind: String(row.change_type) as FileChange['kind'],
    }
  }

  listSessions(): SessionSummary[] {
    const rows = this.db.exec(`
      SELECT *
      FROM sessions
      ORDER BY updated_at DESC, created_at DESC
    `)

    return (rows[0]?.values ?? []).map((values) => {
      const row = rows[0].columns.reduce((acc, key, index) => {
        acc[key] = values[index]
        return acc
      }, {} as Record<string, unknown>)
      return this.readSessionSummary(row)
    })
  }

  getSession(id: string): SessionDetail | null {
    const rows = this.db.exec(`
      SELECT * FROM sessions WHERE id = ?
    `, [id])

    if (!rows[0]?.values.length) return null

    const sessionRow = rows[0].columns.reduce((acc, key, index) => {
      acc[key] = rows[0].values[0][index]
      return acc
    }, {} as Record<string, unknown>)

    const session = this.readSessionSummary(sessionRow)

    const messageRows = this.db.exec(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC
    `, [id])

    const toolRows = this.db.exec(`
      SELECT * FROM tool_calls WHERE session_id = ? ORDER BY started_at ASC NULLS LAST
    `, [id])

    const eventRows = this.db.exec(`
      SELECT * FROM session_events WHERE session_id = ? ORDER BY created_at ASC
    `, [id])

    const fileRows = this.db.exec(`
      SELECT * FROM file_changes WHERE session_id = ? ORDER BY created_at ASC
    `, [id])

    return {
      ...session,
      messages: (messageRows[0]?.values ?? []).map((values) => {
        const row = messageRows[0].columns.reduce((acc, key, index) => {
          acc[key] = values[index]
          return acc
        }, {} as Record<string, unknown>)
        return this.readMessage(row)
      }),
      toolCalls: (toolRows[0]?.values ?? []).map((values) => {
        const row = toolRows[0].columns.reduce((acc, key, index) => {
          acc[key] = values[index]
          return acc
        }, {} as Record<string, unknown>)
        return this.readToolCall(row)
      }),
      events: (eventRows[0]?.values ?? []).map((values) => {
        const row = eventRows[0].columns.reduce((acc, key, index) => {
          acc[key] = values[index]
          return acc
        }, {} as Record<string, unknown>)
        return this.readEvent(row)
      }),
      files: (fileRows[0]?.values ?? []).map((values) => {
        const row = fileRows[0].columns.reduce((acc, key, index) => {
          acc[key] = values[index]
          return acc
        }, {} as Record<string, unknown>)
        return this.readFileChange(row)
      }),
    }
  }

  createSession(input?: CreateSessionInput): SessionSummary {
    const now = new Date().toISOString()
    const sessionId = generateId('session')
    const title = input?.title ?? 'New Bel session'
    const workspacePath = input?.workspacePath ?? '~/workspace'
    const model = input?.model ?? 'deepseek-chat'
    const provider = input?.provider ?? 'OpenRouter'

    this.db.run(`
      INSERT INTO sessions (id, title, workspace_path, status, provider, model, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [sessionId, title, workspacePath, 'idle', provider, model, now, now])

    return {
      id: sessionId,
      title,
      workspacePath,
      status: 'idle',
      updatedAt: now,
      model,
      provider,
    }
  }

  updateSessionStatus(sessionId: string, status: SessionSummary['status']): void {
    const now = new Date().toISOString()
    this.db.run(`
      UPDATE sessions
      SET status = ?, updated_at = ?
      WHERE id = ?
    `, [status, now, sessionId])
  }

  addMessage(sessionId: string, role: Message['role'], content: string): Message {
    const now = new Date().toISOString()
    const messageId = generateId('message')
    this.db.run(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [messageId, sessionId, role, content, now])

    return {
      id: messageId,
      sessionId,
      role,
      content,
      createdAt: now,
    }
  }

  addToolCall(sessionId: string, name: string, status: ToolCall['status'], input: Record<string, unknown>, output?: string, error?: string): ToolCall {
    const now = new Date().toISOString()
    const id = generateId('tool')
    this.db.run(`
      INSERT INTO tool_calls (id, session_id, name, status, input_json, output_json, error, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, sessionId, name, status, JSON.stringify(input), output ?? null, error ?? null, now, now])

    return {
      id,
      name,
      status,
      input,
      output,
      error,
      duration: '0ms',
      startedAt: now,
      finishedAt: now,
    }
  }

  updateToolCall(id: string, partial: Partial<ToolCall>): void {
    const current = this.getToolCall(id)
    if (!current) return

    const next: ToolCall = {
      ...current,
      ...partial,
    }

    const startedAt = next.startedAt ?? current.startedAt ?? null
    const finishedAt = next.finishedAt ?? current.finishedAt ?? null

    this.db.run(`
      UPDATE tool_calls
      SET status = ?, input_json = ?, output_json = ?, error = ?, started_at = ?, finished_at = ?
      WHERE id = ?
    `, [
      next.status,
      JSON.stringify(next.input),
      next.output ?? null,
      next.error ?? null,
      startedAt,
      finishedAt,
      id,
    ])
  }

  private getToolCall(id: string): ToolCall | null {
    const rows = this.db.exec(`SELECT * FROM tool_calls WHERE id = ?`, [id])
    if (!rows[0]?.values.length) return null
    const row = rows[0].columns.reduce((acc, key, index) => {
      acc[key] = rows[0].values[0][index]
      return acc
    }, {} as Record<string, unknown>)
    return this.readToolCall(row)
  }

  addEvent(sessionId: string, kind: string, message: string, metadata?: Record<string, unknown>): SessionEvent {
    const now = new Date().toISOString()
    const eventId = generateId('event')
    this.db.run(`
      INSERT INTO session_events (id, session_id, type, message, metadata_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [eventId, sessionId, kind, message, metadata ? JSON.stringify(metadata) : null, now])

    return {
      id: eventId,
      type: kind,
      timestamp: now,
      message,
      metadata,
    }
  }

  addFileChange(sessionId: string, path: string, kind: FileChange['kind']): FileChange {
    const now = new Date().toISOString()
    const id = generateId('file')
    this.db.run(`
      INSERT INTO file_changes (id, session_id, path, change_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [id, sessionId, path, kind, now])

    return { id, path, kind }
  }
}
