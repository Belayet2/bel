import { isToolError, toolError, type ToolCallContext, type ToolDefinition, type ToolError, type ToolRegistry, type ToolResult } from './types'

/** Small name-indexed registry used by plugins and the future agent loop. */
export class InMemoryToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>()

  register<TInput>(tool: ToolDefinition<TInput>): () => void {
    if (!tool.name.trim()) throw new Error('Tool name must not be empty')
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`)
    this.tools.set(tool.name, tool as ToolDefinition)
    return () => {
      if (this.tools.get(tool.name) === tool) this.tools.delete(tool.name)
    }
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  list(): readonly ToolDefinition[] {
    return [...this.tools.values()]
  }

  async execute(name: string, input: unknown, context: ToolCallContext): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) return { ok: false, error: toolError('tool_not_found', `Unknown tool: ${name}`, { name }) }

    let validated: unknown
    try {
      validated = tool.validate(input)
    } catch (error) {
      return { ok: false, error: toolError('invalid_tool_input', error instanceof Error ? error.message : 'Tool input validation failed') }
    }
    if (isToolError(validated)) return { ok: false, error: validated }

    try {
      return await tool.execute(validated, context)
    } catch (error) {
      return { ok: false, error: toolError('tool_execution_failed', error instanceof Error ? error.message : 'Tool execution failed') }
    }
  }
}

export function requiredString(input: unknown, field: string): string | ToolError {
  if (typeof input !== 'object' || input === null) return toolError('invalid_input', 'Tool input must be an object')
  const value = (input as Record<string, unknown>)[field]
  return typeof value === 'string' && value.length > 0
    ? value
    : toolError('invalid_input', `${field} must be a non-empty string`, { field })
}

export function objectInput(input: unknown): Record<string, unknown> | ToolError {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Record<string, unknown>
    : toolError('invalid_input', 'Tool input must be an object')
}
