import { objectInput, requiredString } from '../tools/registry'
import { toolError, type ToolDefinition, type ToolError } from '../tools/types'
import type { BelPlugin } from './types'

const isError = (value: unknown): value is ToolError => typeof value === 'object' && value !== null && 'code' in value && 'message' in value
const stringField = (input: Record<string, unknown>, name: string): string | ToolError => requiredString(input, name)

export const shellRuntimePlugin: BelPlugin = {
  name: 'bel-shell-runtime',
  setup(context) {
    const register = <T>(tool: ToolDefinition<T>): void => context.tools.register(tool)
    register({ name: 'run_command', description: 'Run a workspace shell command.', inputSchema: { type: 'object', properties: { command: { type: 'string' }, timeoutMs: { type: 'number' } }, required: ['command'] }, risk: 'risky', requiresApproval: true, validate(input) { const object = objectInput(input); if (isError(object)) return object; const command = stringField(object, 'command'); return typeof command === 'string' ? { command, timeoutMs: typeof object.timeoutMs === 'number' ? object.timeoutMs : undefined } : command }, async execute(input, context) { try { const result = await context.services.shell.runCommand(input.command, { timeoutMs: input.timeoutMs, signal: context.signal }); return { ok: result.exitCode === 0, output: JSON.stringify(result), ...(result.exitCode === 0 ? {} : { error: toolError('command_failed', result.stderr || 'Command failed') }) } } catch (error) { return { ok: false, error: toolError('run_command_failed', error instanceof Error ? error.message : 'Command failed') } } } })
    register({ name: 'run_background', description: 'Start a background workspace command.', inputSchema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] }, risk: 'risky', requiresApproval: true, validate(input) { const object = objectInput(input); if (isError(object)) return object; const command = stringField(object, 'command'); return typeof command === 'string' ? { command } : command }, async execute(input) { const job = context.services.shell.startBackground(input.command); return { ok: true, output: JSON.stringify(job) } } })
    register({ name: 'read_job_output', description: 'Read a background job status and output.', inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'] }, risk: 'safe', validate(input) { const object = objectInput(input); if (isError(object)) return object; const id = stringField(object, 'jobId'); return typeof id === 'string' ? { jobId: id } : id }, async execute(input) { const job = context.services.shell.readJobOutput(input.jobId); return job ? { ok: true, output: JSON.stringify(job) } : { ok: false, error: toolError('job_not_found', 'Background job not found') } } })
    register({ name: 'kill_job', description: 'Terminate a running background job.', inputSchema: { type: 'object', properties: { jobId: { type: 'string' } }, required: ['jobId'] }, risk: 'destructive', requiresApproval: true, validate(input) { const object = objectInput(input); if (isError(object)) return object; const id = stringField(object, 'jobId'); return typeof id === 'string' ? { jobId: id } : id }, async execute(input) { return context.services.shell.killJob(input.jobId) ? { ok: true, output: `Killed ${input.jobId}` } : { ok: false, error: toolError('kill_job_failed', 'Job is not running or does not exist') } } })
    context.registerCleanup(() => undefined)
  },
}
