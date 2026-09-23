import { promises as fs } from 'node:fs'
import path from 'node:path'
import { GitService } from '../services/git'
import { objectInput, requiredString } from '../tools/registry'
import { toolError, type ToolDefinition, type ToolError } from '../tools/types'
import type { BelPlugin } from './types'

const git = new GitService(process.cwd())
function inputError(value: unknown): value is ToolError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}
function optionalString(object: Record<string, unknown>, name: string): string | undefined | ToolError {
  if (object[name] === undefined) return undefined
  const value = requiredString(object, name)
  return value
}

const simpleGitTool = (name: string, description: string, args: (input: Record<string, unknown>) => string[]): ToolDefinition<Record<string, unknown>> => ({
  name,
  description,
  inputSchema: { type: 'object' },
  validate(input) {
    const object = objectInput(input)
    return inputError(object) ? object : object
  },
  async execute(input, context) {
    const result = await git.run(args(input))
    context.emit({ type: 'tool.completed', message: `${name} completed`, metadata: { exitCode: result.exitCode } })
    return result.exitCode === 0
      ? { ok: true, output: result.stdout }
      : { ok: false, error: toolError('git_command_failed', result.stderr || result.stdout || `${name} failed`, { exitCode: result.exitCode }) }
  },
})

const gitStatus = simpleGitTool('git_status', 'Show the working tree status.', () => ['status', '--short', '--branch'])
const gitDiff = simpleGitTool('git_diff', 'Show unstaged or staged changes.', input => input.staged === true ? ['diff', '--cached'] : ['diff'])
const gitLog = simpleGitTool('git_log', 'Show recent commits.', input => ['log', '-n', String(typeof input.limit === 'number' ? Math.min(Math.max(input.limit, 1), 100) : 20), '--oneline', '--decorate'])
const gitShow = simpleGitTool('git_show', 'Show a commit or Git object.', input => ['show', String(input.ref ?? 'HEAD')])
const gitBranch = simpleGitTool('git_branch', 'List or create local branches.', input => input.name === undefined ? ['branch', '--list'] : ['switch', '-c', String(input.name)])

const gitCommit: ToolDefinition<{ message: string }> = {
  name: 'git_commit',
  description: 'Create a Git commit. This is a risky action and should require approval in the future agent loop.',
  inputSchema: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'] },
  validate(input) {
    const object = objectInput(input)
    if (inputError(object)) return object
    const message = requiredString(object, 'message')
    return typeof message === 'string' ? { message } : message
  },
  async execute(input, context) {
    const result = await git.run(['commit', '-m', input.message])
    context.emit({ type: 'tool.completed', message: 'git_commit completed', metadata: { exitCode: result.exitCode } })
    return result.exitCode === 0
      ? { ok: true, output: result.stdout }
      : { ok: false, error: toolError('git_commit_failed', result.stderr || result.stdout || 'Git commit failed', { exitCode: result.exitCode }) }
  },
}

export const gitToolDefinitions: ToolDefinition[] = [gitStatus, gitDiff, gitLog, gitShow, gitCommit, gitBranch]

export const gitPlugin: BelPlugin = {
  name: 'bel-git',
  setup(context) {
    const unregisters = gitToolDefinitions.map(tool => context.tools.register(tool))
    context.registerCleanup(() => { for (const unregister of unregisters) unregister() })
  },
}
