export interface ToolCallContext {
  readonly sessionId: string
  readonly signal?: AbortSignal
  emit(event: Pick<SessionEvent, 'type' | 'message' | 'metadata'>): void
}

export interface ToolResult {
  readonly ok: boolean
  readonly output?: string
  readonly error?: ToolError
}

export interface ToolError {
  readonly code: string
  readonly message: string
  readonly details?: Record<string, unknown>
}

export interface ToolDefinition<TInput = unknown> {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
  readonly risk?: 'safe' | 'risky' | 'destructive'
  readonly requiresApproval?: boolean
  validate(input: unknown): TInput | ToolError
  execute(input: TInput, context: ToolCallContext): Promise<ToolResult>
}

export interface ToolRegistry {
  register<TInput>(tool: ToolDefinition<TInput>): () => void
  get(name: string): ToolDefinition | undefined
  list(): readonly ToolDefinition[]
  execute(name: string, input: unknown, context: ToolCallContext): Promise<ToolResult>
}

export function toolError(code: string, message: string, details?: Record<string, unknown>): ToolError {
  return { code, message, ...(details === undefined ? {} : { details }) }
}

export function isToolError(value: unknown): value is ToolError {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.code === 'string' && typeof candidate.message === 'string'
}
