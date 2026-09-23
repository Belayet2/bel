export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool'
  readonly content: string
  readonly name?: string
  readonly toolCallId?: string
}

export interface LlmToolDefinition {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
}

export interface LlmRequest {
  readonly model: string
  readonly messages: readonly ChatMessage[]
  readonly tools?: readonly LlmToolDefinition[]
  readonly temperature?: number
  readonly maxTokens?: number
  readonly signal?: AbortSignal
}

export interface LlmToolCall {
  readonly id: string
  readonly name: string
  readonly arguments: unknown
}

export interface LlmResponse {
  readonly id: string
  readonly model: string
  readonly content: string
  readonly toolCalls: readonly LlmToolCall[]
  readonly finishReason: string | null
  readonly usage?: {
    readonly promptTokens?: number
    readonly completionTokens?: number
    readonly totalTokens?: number
  }
}

export interface LlmProvider {
  readonly name: string
  complete(request: LlmRequest): Promise<LlmResponse>
}
