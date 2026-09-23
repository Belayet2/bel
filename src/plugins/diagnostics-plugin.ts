import { objectInput, requiredString } from '../tools/registry'
import type { BelPlugin } from '../plugins/types'
import type { ToolDefinition } from '../tools/types'

interface EchoInput { text: string }

const echoTool: ToolDefinition<EchoInput> = {
  name: 'echo',
  description: 'Return text to verify the Bel tool pipeline.',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
  validate(input) {
    const object = objectInput(input)
    if ('code' in object) return object
    const text = requiredString(object, 'text')
    return typeof text === 'string' ? { text } : text
  },
  async execute(input, context) {
    context.emit({ type: 'tool.completed', message: 'echo completed', metadata: { tool: 'echo' } })
    return { ok: true, output: input.text }
  },
}

/** Built-in diagnostics plugin; real filesystem/shell plugins will follow this seam. */
export const diagnosticsPlugin: BelPlugin = {
  name: 'bel-diagnostics',
  setup(context) {
    const unregister = context.tools.register(echoTool)
    context.registerCleanup(unregister)
  },
}
