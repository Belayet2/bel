import { promises as fs } from 'node:fs'
import path from 'node:path'
import { objectInput, requiredString } from '../tools/registry'
import { toolError, type ToolDefinition, type ToolError } from '../tools/types'
import type { BelPlugin } from './types'

const isError = (value: unknown): value is ToolError => typeof value === 'object' && value !== null && 'code' in value && 'message' in value
const stringField = (input: Record<string, unknown>, name: string): string | ToolError => requiredString(input, name)

export const filesystemPlugin: BelPlugin = {
  name: 'bel-filesystem',
  setup(context) {
    const make = <T>(tool: ToolDefinition<T>): void => context.tools.register(tool)
    make({ name: 'read_file', description: 'Read a UTF-8 file inside the workspace.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }, risk: 'safe', validate(input) { const object = objectInput(input); if (isError(object)) return object; const value = stringField(object, 'path'); return typeof value === 'string' ? { path: value } : value }, async execute(input) { try { return { ok: true, output: await context.services.filesystem.readFile(input.path) } } catch (error) { return { ok: false, error: toolError('read_file_failed', error instanceof Error ? error.message : 'Read failed') } } } })
    make({ name: 'write_file', description: 'Write a UTF-8 file inside the workspace.', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] }, risk: 'risky', requiresApproval: true, validate(input) { const object = objectInput(input); if (isError(object)) return object; const p = stringField(object, 'path'); const c = stringField(object, 'content'); if (typeof p !== 'string') return p; return typeof c === 'string' ? { path: p, content: c } : c }, async execute(input) { try { await context.services.filesystem.writeFile(input.path, input.content); return { ok: true, output: `Wrote ${input.path}` } } catch (error) { return { ok: false, error: toolError('write_file_failed', error instanceof Error ? error.message : 'Write failed') } } } })
    make({ name: 'list_directory', description: 'List workspace directory entries.', inputSchema: { type: 'object', properties: { path: { type: 'string' } } }, risk: 'safe', validate(input) { const object = objectInput(input); if (isError(object)) return object; return { path: typeof object.path === 'string' ? object.path : '.' } }, async execute(input) { try { return { ok: true, output: JSON.stringify(await context.services.filesystem.listDirectory(input.path), null, 2) } } catch (error) { return { ok: false, error: toolError('list_directory_failed', error instanceof Error ? error.message : 'List failed') } } } })
    make({ name: 'delete_file', description: 'Delete a file inside the workspace.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }, risk: 'destructive', requiresApproval: true, validate(input) { const object = objectInput(input); if (isError(object)) return object; const p = stringField(object, 'path'); return typeof p === 'string' ? { path: p } : p }, async execute(input) { try { await context.services.filesystem.deleteFile(input.path); return { ok: true, output: `Deleted ${input.path}` } } catch (error) { return { ok: false, error: toolError('delete_file_failed', error instanceof Error ? error.message : 'Delete failed') } } } })
    context.registerCleanup(() => undefined)
  },
}

void fs; void path
