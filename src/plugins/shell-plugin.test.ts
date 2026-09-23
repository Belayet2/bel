import { objectInput, requiredString } from '../tools/registry'
import { toolError, type ToolDefinition, type ToolError } from '../tools/types'
import type { BelPlugin } from './types'
import { ShellService } from '../services/shell'

const shellService = new ShellService(process.cwd())

function isToolInputError(value: unknown): value is ToolError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

const runCommandTool: ToolDefinition<{ command: string; timeoutMs?: number; maxOutputBytes?: number }> = {
  name: 'run_command',
  description: 'Run a shell command in the workspace with a timeout and output limit.',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string' },
      timeoutMs: { type: 'number' },
      maxOutputBytes: { type: 'number' },
    },
    required: ['command'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const commandValue = requiredString(object, 'command')
    if (typeof commandValue !== 'string') return commandValue

    const timeoutMs = typeof object.timeoutMs === 'number' ? object.timeoutMs : undefined
    const maxOutputBytes = typeof object.maxOutputBytes === 'number' ? object.maxOutputBytes : undefined

    return {
      command: commandValue,
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
      ...(maxOutputBytes === undefined ? {} : { maxOutputBytes }),
    }
  },
  async execute(input, context) {
    context.emit({ type: 'tool.started', message: 'run_command started', metadata: { command: input.command } })
    try {
      const result = await shellService.runCommand(input.command, {
        timeoutMs: input.timeoutMs,
        maxOutputBytes: input.maxOutputBytes,
      })
      context.emit({ type: 'tool.completed', message: 'run_command completed', metadata: { command: input.command, exitCode: result.exitCode } })
      return {
        ok: true,
        output: JSON.stringify({
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          timedOut: result.timedOut,
        }, null, 2),
      }
    } catch (error) {
      return { ok: false, error: toolError('run_command_failed', error instanceof Error ? error.message : 'Shell command failed', { command: input.command }) }
    }
  },
}

const runBackgroundTool: ToolDefinition<{ command: string }> = {
  name: 'run_background',
  description: 'Launch a shell command in the background and return a job identifier.',
  inputSchema: {
    type: 'object',
    properties: { command: { type: 'string' } },
    required: ['command'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const commandValue = requiredString(object, 'command')
    return typeof commandValue === 'string' ? { command: commandValue } : commandValue
  },
  async execute(input, context) {
    const job = shellService.startBackground(input.command)
    context.emit({ type: 'tool.started', message: 'run_background started', metadata: { jobId: job.id, command: input.command } })
    return { ok: true, output: JSON.stringify({ jobId: job.id, status: job.status, pid: job.pid }, null, 2) }
  },
}

const readJobOutputTool: ToolDefinition<{ jobId: string }> = {
  name: 'read_job_output',
  description: 'Read the buffered output of an existing background job.',
  inputSchema: {
    type: 'object',
    properties: { jobId: { type: 'string' } },
    required: ['jobId'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const jobIdValue = requiredString(object, 'jobId')
    return typeof jobIdValue === 'string' ? { jobId: jobIdValue } : jobIdValue
  },
  async execute(input, context) {
    const job = shellService.readJobOutput(input.jobId)
    if (!job) {
      return { ok: false, error: toolError('job_not_found', 'Background job not found', { jobId: input.jobId }) }
    }

    context.emit({ type: 'tool.completed', message: 'read_job_output completed', metadata: { jobId: input.jobId, status: job.status } })
    return {
      ok: true,
      output: JSON.stringify({ jobId: job.id, status: job.status, stdout: job.stdout, stderr: job.stderr, exitCode: job.exitCode, signal: job.signal }, null, 2),
    }
  },
}

const killJobTool: ToolDefinition<{ jobId: string }> = {
  name: 'kill_job',
  description: 'Terminate a running background job.',
  inputSchema: {
    type: 'object',
    properties: { jobId: { type: 'string' } },
    required: ['jobId'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const jobIdValue = requiredString(object, 'jobId')
    return typeof jobIdValue === 'string' ? { jobId: jobIdValue } : jobIdValue
  },
  async execute(input, context) {
    const ok = shellService.killJob(input.jobId)
    if (!ok) {
      return { ok: false, error: toolError('kill_job_failed', 'Failed to terminate the job', { jobId: input.jobId }) }
    }

    context.emit({ type: 'tool.completed', message: 'kill_job completed', metadata: { jobId: input.jobId } })
    return { ok: true, output: JSON.stringify({ jobId: input.jobId, status: 'killed' }, null, 2) }
  },
}

export const shellToolDefinitions: ToolDefinition[] = [
  runCommandTool,
  runBackgroundTool,
  readJobOutputTool,
  killJobTool,
]

export const shellPlugin: BelPlugin = {
  name: 'bel-shell',
  setup(context) {
    const unregisters = shellToolDefinitions.map(tool => context.tools.register(tool))
    context.registerCleanup(() => {
      for (const unregister of unregisters) unregister()
    })
  },
}
