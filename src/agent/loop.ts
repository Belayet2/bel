import type { LlmProvider, LlmResponse } from '../llm/types'
import type { ToolDefinition } from '../tools/types'
import type { ApprovalGate } from './safety'

export interface AgentMessage {
  readonly role: 'user' | 'assistant' | 'tool' | 'system'
  readonly content: string
  readonly name?: string
  readonly toolCallId?: string
}

export interface AgentLoopConfig {
  readonly model: string
  readonly maxToolIterations?: number
  readonly systemPrompt?: string
}

export interface ToolExecutionResult {
  readonly toolCallId: string
  readonly name: string
  readonly ok: boolean
  readonly output?: string
  readonly error?: string
}

export class AgentLoop {
  constructor(
    private readonly provider: LlmProvider,
    private readonly tools: ReadonlyMap<string, ToolDefinition>,
    private readonly config: AgentLoopConfig,
    private readonly approvalGate?: ApprovalGate,
  ) {}

  async run(messages: readonly AgentMessage[], signal?: AbortSignal): Promise<{ finalText: string; toolResults: ToolExecutionResult[]; response: LlmResponse }> {
    const conversation = [...messages]
    const toolResults: ToolExecutionResult[] = []
    const maxToolIterations = this.config.maxToolIterations ?? 12

    for (let iteration = 0; iteration < maxToolIterations; iteration++) {
      if (signal?.aborted) throw new DOMException('Agent loop aborted', 'AbortError')

      const requestMessages = this.normalizeMessages(conversation)
      const response = await this.provider.complete({
        model: this.config.model,
        messages: requestMessages,
        tools: [...this.tools.values()].map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
        signal,
      })

      if (response.toolCalls.length === 0) {
        return { finalText: response.content, toolResults, response }
      }

      for (const toolCall of response.toolCalls) {
        const toolDefinition = this.tools.get(toolCall.name)
        if (!toolDefinition) {
          const errorText = `Tool not found: ${toolCall.name}`
          toolResults.push({ toolCallId: toolCall.id, name: toolCall.name, ok: false, error: errorText })
          conversation.push({ role: 'tool', content: errorText, name: toolCall.name, toolCallId: toolCall.id })
          continue
        }

        if (this.approvalGate) {
          const decision = this.approvalGate.evaluate({
            toolName: toolCall.name,
            input: toolCall.arguments,
            risk: toolDefinition.risk ?? 'safe',
          })

          if (decision === 'deny') {
            const errorText = `Tool execution denied by safety policy: ${toolCall.name}`
            toolResults.push({ toolCallId: toolCall.id, name: toolCall.name, ok: false, error: errorText })
            conversation.push({ role: 'tool', content: errorText, name: toolCall.name, toolCallId: toolCall.id })
            continue
          }

          if (decision === 'approve') {
            const errorText = `Approval required before executing tool: ${toolCall.name}`
            toolResults.push({ toolCallId: toolCall.id, name: toolCall.name, ok: false, error: errorText })
            conversation.push({ role: 'tool', content: errorText, name: toolCall.name, toolCallId: toolCall.id })
            continue
          }
        }

        const validationResult = toolDefinition.validate(toolCall.arguments)
        if (typeof validationResult === 'object' && validationResult !== null && 'code' in validationResult && 'message' in validationResult) {
          const errorText = validationResult.message
          toolResults.push({ toolCallId: toolCall.id, name: toolCall.name, ok: false, error: errorText })
          conversation.push({ role: 'tool', content: errorText, name: toolCall.name, toolCallId: toolCall.id })
          continue
        }

        const outcome = await toolDefinition.execute(validationResult, {
          sessionId: 'agent-loop',
          emit: () => undefined,
          signal,
        })

        const toolOutcome = outcome.ok
          ? { toolCallId: toolCall.id, name: toolCall.name, ok: true, output: outcome.output }
          : { toolCallId: toolCall.id, name: toolCall.name, ok: false, error: outcome.error?.message ?? 'Unknown tool failure' }

        toolResults.push(toolOutcome)
        conversation.push({
          role: 'tool',
          content: outcome.ok ? (outcome.output ?? '') : (outcome.error?.message ?? 'Tool failed'),
          name: toolCall.name,
          toolCallId: toolCall.id,
        })
      }
    }

    throw new Error('Agent loop exceeded maximum tool iterations without reaching a final answer')
  }

  private normalizeMessages(messages: readonly AgentMessage[]): AgentMessage[] {
    const systemPrompt = this.config.systemPrompt ?? 'You are Bel, a helpful plugin-based coding assistant.'
    const normalized = [...messages]
    if (!normalized.some(message => message.role === 'system')) {
      normalized.unshift({ role: 'system', content: systemPrompt })
    }
    return normalized
  }
}

export function createAgentLoop(provider: LlmProvider, tools: ReadonlyMap<string, ToolDefinition>, config: AgentLoopConfig, approvalGate?: ApprovalGate): AgentLoop {
  return new AgentLoop(provider, tools, config, approvalGate)
}
