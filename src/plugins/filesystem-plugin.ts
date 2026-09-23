import { promises as fs } from 'node:fs'
import path from 'node:path'
import { objectInput, requiredString } from '../tools/registry'
import { toolError, type ToolDefinition, type ToolError } from '../tools/types'
import type { BelPlugin } from './types'

const WORKSPACE_ROOT = process.cwd()

function resolveWorkspacePath(filePath: string): string {
  const resolvedRoot = path.resolve(WORKSPACE_ROOT)
  const candidate = path.resolve(WORKSPACE_ROOT, filePath)
  const relative = path.relative(resolvedRoot, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Workspace path restriction: requested path is outside the project root')
  }
  return candidate
}

async function walkDirectory(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await walkDirectory(full))
    } else {
      results.push(full)
    }
  }
  return results
}

function isToolInputError(value: unknown): value is ToolError {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

const readFileTool: ToolDefinition<{ path: string }> = {
  name: 'read_file',
  description: 'Read a UTF-8 text file inside the working directory.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const resolved = requiredString(object, 'path')
    return typeof resolved === 'string' ? { path: resolved } : resolved
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path)
      const content = await fs.readFile(resolved, 'utf8')
      context.emit({ type: 'tool.completed', message: 'read_file completed', metadata: { path: input.path, bytes: content.length } })
      return { ok: true, output: content }
    } catch (error) {
      return { ok: false, error: toolError('read_file_failed', error instanceof Error ? error.message : 'Failed to read file', { path: input.path }) }
    }
  },
}

const writeFileTool: ToolDefinition<{ path: string; content: string }> = {
  name: 'write_file',
  description: 'Write or overwrite a UTF-8 text file inside the working directory.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, content: { type: 'string' } },
    required: ['path', 'content'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const pathValue = requiredString(object, 'path')
    const contentValue = requiredString(object, 'content')
    if (typeof pathValue === 'string' && typeof contentValue === 'string') return { path: pathValue, content: contentValue }
    if (typeof pathValue !== 'string') return pathValue
    return contentValue
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path)
      await fs.mkdir(path.dirname(resolved), { recursive: true })
      await fs.writeFile(resolved, input.content, 'utf8')
      context.emit({ type: 'tool.completed', message: 'write_file completed', metadata: { path: input.path, bytes: input.content.length } })
      return { ok: true, output: `Wrote ${input.content.length} characters to ${input.path}` }
    } catch (error) {
      return { ok: false, error: toolError('write_file_failed', error instanceof Error ? error.message : 'Failed to write file', { path: input.path }) }
    }
  },
}

const editFileTool: ToolDefinition<{ path: string; find: string; replace: string }> = {
  name: 'edit_file',
  description: 'Replace one exact text section in a file inside the project root.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, find: { type: 'string' }, replace: { type: 'string' } },
    required: ['path', 'find', 'replace'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const pathValue = requiredString(object, 'path')
    const findValue = requiredString(object, 'find')
    const replaceValue = requiredString(object, 'replace')
    if (typeof pathValue === 'string' && typeof findValue === 'string' && typeof replaceValue === 'string') return { path: pathValue, find: findValue, replace: replaceValue }
    if (typeof pathValue !== 'string') return pathValue
    if (typeof findValue !== 'string') return findValue
    return replaceValue
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path)
      const original = await fs.readFile(resolved, 'utf8')
      if (!original.includes(input.find)) {
        return { ok: false, error: toolError('edit_not_found', 'Target text not found in file', { path: input.path, find: input.find }) }
      }
      const updated = original.replace(input.find, input.replace)
      await fs.writeFile(resolved, updated, 'utf8')
      context.emit({ type: 'tool.completed', message: 'edit_file completed', metadata: { path: input.path, replacements: 1 } })
      return { ok: true, output: `Updated ${input.path}` }
    } catch (error) {
      return { ok: false, error: toolError('edit_file_failed', error instanceof Error ? error.message : 'Failed to edit file', { path: input.path }) }
    }
  },
}

const listDirectoryTool: ToolDefinition<{ path?: string }> = {
  name: 'list_directory',
  description: 'List files and folders in a directory inside the project root.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const pathValue = object.path
    return typeof pathValue === 'string' ? { path: pathValue } : { path: '.' }
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path ?? '.')
      const entries = await fs.readdir(resolved, { withFileTypes: true })
      const listing = entries.map(entry => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }))
      context.emit({ type: 'tool.completed', message: 'list_directory completed', metadata: { path: input.path ?? '.', count: listing.length } })
      return { ok: true, output: JSON.stringify(listing, null, 2) }
    } catch (error) {
      return { ok: false, error: toolError('list_directory_failed', error instanceof Error ? error.message : 'Failed to list directory', { path: input.path ?? '.' }) }
    }
  },
}

const globTool: ToolDefinition<{ pattern: string }> = {
  name: 'glob',
  description: 'Find files matching a simple glob pattern under the workspace root.',
  inputSchema: {
    type: 'object',
    properties: { pattern: { type: 'string' } },
    required: ['pattern'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const patternValue = requiredString(object, 'pattern')
    return typeof patternValue === 'string' ? { pattern: patternValue } : patternValue
  },
  async execute(input, context) {
    try {
      const normalized = input.pattern.replace(/\\/g, '/')
      const root = WORKSPACE_ROOT
      const matches: string[] = []
      const files = await walkDirectory(root)
      const pattern = normalized
        .replace(/\*\*/g, '§§DOUBLESTAR§§')
        .replace(/\*/g, '[^/]*')
        .replace(/§§DOUBLESTAR§§/g, '.*')
      const regex = new RegExp(`^${pattern.replace(/\//g, '\\/')}$`)
      for (const file of files) {
        const rel = path.relative(root, file).replace(/\\/g, '/')
        if (regex.test(rel)) matches.push(rel)
      }
      context.emit({ type: 'tool.completed', message: 'glob completed', metadata: { pattern: input.pattern, count: matches.length } })
      return { ok: true, output: JSON.stringify(matches, null, 2) }
    } catch (error) {
      return { ok: false, error: toolError('glob_failed', error instanceof Error ? error.message : 'Failed to glob files', { pattern: input.pattern }) }
    }
  },
}

const grepTool: ToolDefinition<{ path: string; pattern: string; caseSensitive?: boolean }> = {
  name: 'grep',
  description: 'Search text files for a string or regex pattern inside the project root.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' }, pattern: { type: 'string' }, caseSensitive: { type: 'boolean' } },
    required: ['path', 'pattern'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const pathValue = requiredString(object, 'path')
    const patternValue = requiredString(object, 'pattern')
    if (typeof pathValue === 'string' && typeof patternValue === 'string') {
      return { path: pathValue, pattern: patternValue, caseSensitive: typeof object.caseSensitive === 'boolean' ? object.caseSensitive : false }
    }
    if (typeof pathValue !== 'string') return pathValue
    return patternValue
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path)
      const files = await walkDirectory(resolved)
      const flags = input.caseSensitive ? 'g' : 'gi'
      const regex = new RegExp(input.pattern, flags)
      const results: string[] = []
      for (const file of files) {
        const fileStat = await fs.stat(file)
        if (!fileStat.isFile()) continue
        const content = await fs.readFile(file, 'utf8')
        if (regex.test(content)) {
          results.push(path.relative(WORKSPACE_ROOT, file).replace(/\\/g, '/'))
        }
      }
      context.emit({ type: 'tool.completed', message: 'grep completed', metadata: { pattern: input.pattern, matches: results.length } })
      return { ok: true, output: JSON.stringify(results, null, 2) }
    } catch (error) {
      return { ok: false, error: toolError('grep_failed', error instanceof Error ? error.message : 'Failed to grep files', { path: input.path, pattern: input.pattern }) }
    }
  },
}

const deleteFileTool: ToolDefinition<{ path: string }> = {
  name: 'delete_file',
  description: 'Delete a file inside the current workspace root.',
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const pathValue = requiredString(object, 'path')
    return typeof pathValue === 'string' ? { path: pathValue } : pathValue
  },
  async execute(input, context) {
    try {
      const resolved = resolveWorkspacePath(input.path)
      await fs.unlink(resolved)
      context.emit({ type: 'tool.completed', message: 'delete_file completed', metadata: { path: input.path } })
      return { ok: true, output: `Deleted ${input.path}` }
    } catch (error) {
      return { ok: false, error: toolError('delete_file_failed', error instanceof Error ? error.message : 'Failed to delete file', { path: input.path }) }
    }
  },
}

const moveFileTool: ToolDefinition<{ from: string; to: string }> = {
  name: 'move_file',
  description: 'Move a file from one path to another inside the workspace root.',
  inputSchema: {
    type: 'object',
    properties: { from: { type: 'string' }, to: { type: 'string' } },
    required: ['from', 'to'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const fromValue = requiredString(object, 'from')
    const toValue = requiredString(object, 'to')
    if (typeof fromValue === 'string' && typeof toValue === 'string') return { from: fromValue, to: toValue }
    if (typeof fromValue !== 'string') return fromValue
    return toValue
  },
  async execute(input, context) {
    try {
      const source = resolveWorkspacePath(input.from)
      const target = resolveWorkspacePath(input.to)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.rename(source, target)
      context.emit({ type: 'tool.completed', message: 'move_file completed', metadata: { from: input.from, to: input.to } })
      return { ok: true, output: `Moved ${input.from} to ${input.to}` }
    } catch (error) {
      return { ok: false, error: toolError('move_file_failed', error instanceof Error ? error.message : 'Failed to move file', { from: input.from, to: input.to }) }
    }
  },
}

const copyFileTool: ToolDefinition<{ from: string; to: string }> = {
  name: 'copy_file',
  description: 'Copy a file from one path to another inside the workspace root.',
  inputSchema: {
    type: 'object',
    properties: { from: { type: 'string' }, to: { type: 'string' } },
    required: ['from', 'to'],
  },
  validate(input) {
    const object = objectInput(input)
    if (isToolInputError(object)) return object
    const fromValue = requiredString(object, 'from')
    const toValue = requiredString(object, 'to')
    if (typeof fromValue === 'string' && typeof toValue === 'string') return { from: fromValue, to: toValue }
    if (typeof fromValue !== 'string') return fromValue
    return toValue
  },
  async execute(input, context) {
    try {
      const source = resolveWorkspacePath(input.from)
      const target = resolveWorkspacePath(input.to)
      await fs.mkdir(path.dirname(target), { recursive: true })
      await fs.copyFile(source, target)
      context.emit({ type: 'tool.completed', message: 'copy_file completed', metadata: { from: input.from, to: input.to } })
      return { ok: true, output: `Copied ${input.from} to ${input.to}` }
    } catch (error) {
      return { ok: false, error: toolError('copy_file_failed', error instanceof Error ? error.message : 'Failed to copy file', { from: input.from, to: input.to }) }
    }
  },
}

export const filesystemToolDefinitions: ToolDefinition[] = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  deleteFileTool,
  moveFileTool,
  copyFileTool,
]

export const filesystemPlugin: BelPlugin = {
  name: 'bel-filesystem',
  setup(context) {
    const unregisters = filesystemToolDefinitions.map(tool => context.tools.register(tool))
    context.registerCleanup(() => {
      for (const unregister of unregisters) unregister()
    })
  },
}

export { WORKSPACE_ROOT, resolveWorkspacePath }
