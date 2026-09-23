export type SessionStatus = 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed'
export type ToolCallStatus = 'pending' | 'running' | 'succeeded' | 'failed'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface SessionSummary {
  id: string
  title: string
  workspacePath: string
  status: SessionStatus
  updatedAt: string
  model: string
  provider: string
}

export interface Message {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  createdAt: string
}

export interface ToolCall {
  id: string
  name: string
  status: ToolCallStatus
  input: Record<string, unknown>
  output?: string
  error?: string
  duration?: string
  startedAt?: string
  finishedAt?: string
}

export interface SessionEvent {
  id: string
  type: string
  timestamp: string
  message: string
  metadata?: Record<string, unknown>
}

export interface FileChange {
  id?: string
  path: string
  kind: 'modified' | 'added' | 'deleted'
}

export interface SessionDetail extends SessionSummary {
  messages: Message[]
  toolCalls: ToolCall[]
  events: SessionEvent[]
  files: FileChange[]
}

export interface CreateSessionInput {
  title?: string
  workspacePath?: string
  model?: string
  provider?: string
}

export interface BelUiRuntime {
  listSessions(): Promise<SessionSummary[]>
  getSession(id: string): Promise<SessionDetail | null>
  createSession(input?: CreateSessionInput): Promise<SessionSummary>
  sendMessage(sessionId: string, content: string): Promise<void>
  stopSession(sessionId: string): Promise<void>
  subscribeToSession(sessionId: string, listener: (event: SessionEvent) => void): () => void
}
