import type { ChatMessage, LlmProvider, LlmRequest, LlmResponse, LlmToolCall } from './types'

interface OpenRouterConfig {
  readonly apiKey: string
  readonly baseUrl?: string
  readonly siteUrl?: string
  readonly siteName?: string
}

interface OpenRouterChoice {
  readonly message?: {
    readonly content?: string | null
    readonly tool_calls?: readonly {
      readonly id?: string
      readonly function?: { readonly name?: string; readonly arguments?: string }
    }[]
  }
  readonly finish_reason?: string | null
}

interface OpenRouterPayload {
  readonly id?: string
  readonly model?: string
  readonly choices?: readonly OpenRouterChoice[]
  readonly usage?: { readonly prompt_tokens?: number; readonly completion_tokens?: number; readonly total_tokens?: number }
}

function toProviderMessages(messages: readonly ChatMessage[]): readonly Record<string, unknown>[] {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
    ...(message.name === undefined ? {} : { name: message.name }),
    ...(message.toolCallId === undefined ? {} : { tool_call_id: message.toolCallId }),
  }))
}

export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter'
  private readonly baseUrl: string

  constructor(private readonly config: OpenRouterConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '')
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: toProviderMessages(request.messages),
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
      ...(request.tools === undefined ? {} : {
        tools: request.tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })),
      }),
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': 'application/json',
        ...(this.config.siteUrl === undefined ? {} : { 'http-referer': this.config.siteUrl }),
        ...(this.config.siteName === undefined ? {} : { 'x-title': this.config.siteName }),
      },
      body: JSON.stringify(body),
      signal: request.signal,
    })

    const payload = await this.readPayload(response)
    if (!response.ok) {
      throw new Error(`OpenRouter request failed (${response.status}): ${this.errorMessage(payload)}`)
    }

    const choice = payload.choices?.[0]
    if (choice?.message === undefined) throw new Error('OpenRouter returned no assistant message')

    const toolCalls: LlmToolCall[] = (choice.message.tool_calls ?? []).map((call, index) => {
      const rawArguments = call.function?.arguments ?? '{}'
      let argumentsValue: unknown
      try {
        argumentsValue = JSON.parse(rawArguments)
      } catch {
        throw new Error(`OpenRouter returned invalid JSON arguments for tool call ${index + 1}`)
      }
      return {
        id: call.id ?? `tool-call-${index + 1}`,
        name: call.function?.name ?? '',
        arguments: argumentsValue,
      }
    })

    return {
      id: payload.id ?? `openrouter-${Date.now()}`,
      model: payload.model ?? request.model,
      content: choice.message.content ?? '',
      toolCalls,
      finishReason: choice.finish_reason ?? null,
      usage: payload.usage === undefined ? undefined : {
        promptTokens: payload.usage.prompt_tokens,
        completionTokens: payload.usage.completion_tokens,
        totalTokens: payload.usage.total_tokens,
      },
    }
  }

  private async readPayload(response: Response): Promise<OpenRouterPayload> {
    const text = await response.text()
    if (!text) return {}
    try {
      return JSON.parse(text) as OpenRouterPayload
    } catch {
      throw new Error('OpenRouter returned invalid JSON')
    }
  }

  private errorMessage(payload: OpenRouterPayload): string {
    const candidate = payload as OpenRouterPayload & { error?: { message?: string } }
    return candidate.error?.message ?? 'unknown provider error'
  }
}

export function createOpenRouterProvider(config: OpenRouterConfig): OpenRouterProvider {
  if (!config.apiKey.trim()) throw new Error('OpenRouter API key must not be empty')
  return new OpenRouterProvider(config)
}
