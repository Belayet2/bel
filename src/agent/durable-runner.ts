import type { AgentLoop, AgentMessage, ToolExecutionResult } from './loop'
import type { SessionEvent, SessionSummary } from '../shared/types'

export interface AgentSessionStore {
  getSession(sessionId: string): { id: string; status: SessionSummary['status'] } | null
  addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): { id: string }
  updateSessionStatus(sessionId: string, status: SessionSummary['status']): void
  addToolCall(sessionId: string, name: string, status: 'pending' | 'running' | 'succeeded' | 'failed', input: Record<string, unknown>, output?: string, error?: string): { id: string }
  addEvent(sessionId: string, type: string, message: string, metadata?: Record<string, unknown>): SessionEvent
}

export interface DurableAgentRunResult {
  readonly finalText: string
  readonly toolResults: readonly ToolExecutionResult[]
}

/** Runs the loop while recording the durable facts needed to resume and inspect a session. */
export class DurableAgentRunner {
  constructor(private readonly loop: AgentLoop, private readonly store: AgentSessionStore) {}

  async run(sessionId: string, userText: string, signal?: AbortSignal): Promise<DurableAgentRunResult> {
    const session = this.store.getSession(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)

    this.store.addMessage(sessionId, 'user', userText)
    this.store.addEvent(sessionId, 'turn.started', 'Agent turn started', { sessionId })
    this.store.updateSessionStatus(sessionId, 'running')

    try {
      const result = await this.loop.run([{ role: 'user', content: userText } satisfies AgentMessage], signal)

      for (const toolResult of result.toolResults) {
        this.store.addToolCall(
          sessionId,
          toolResult.name,
          toolResult.ok ? 'succeeded' : 'failed',
          { toolCallId: toolResult.toolCallId },
          toolResult.output,
          toolResult.error,
        )
        this.store.addEvent(sessionId, toolResult.ok ? 'tool.completed' : 'tool.failed', `${toolResult.name} ${toolResult.ok ? 'completed' : 'failed'}`, {
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.name,
        })
      }

      this.store.addMessage(sessionId, 'assistant', result.finalText)
      this.store.addEvent(sessionId, 'turn.completed', 'Agent turn completed', {
        toolCount: result.toolResults.length,
      })
      this.store.updateSessionStatus(sessionId, 'completed')
      return { finalText: result.finalText, toolResults: result.toolResults }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agent turn failed'
      this.store.addEvent(sessionId, 'turn.failed', message)
      this.store.updateSessionStatus(sessionId, 'failed')
      throw error
    }
  }
}
