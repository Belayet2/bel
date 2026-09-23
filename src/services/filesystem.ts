import { promises as fs } from 'node:fs'
import path from 'node:path'

export class FilesystemService {
  readonly workspaceRoot: string

  constructor(workspaceRoot = process.cwd()) {
    this.workspaceRoot = path.resolve(workspaceRoot)
  }

  resolve(relativePath: string): string {
    const candidate = path.resolve(this.workspaceRoot, relativePath)
    const relative = path.relative(this.workspaceRoot, candidate)
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Requested path is outside the workspace root')
    }
    return candidate
  }

  async readFile(relativePath: string, maxBytes = 200_000): Promise<string> {
    const content = await fs.readFile(this.resolve(relativePath), 'utf8')
    return content.length > maxBytes ? `${content.slice(0, maxBytes)}\n[output truncated]` : content
  }

  async writeFile(relativePath: string, content: string, maxBytes = 1_000_000): Promise<void> {
    if (Buffer.byteLength(content, 'utf8') > maxBytes) throw new Error(`File exceeds the ${maxBytes}-byte limit`)
    const target = this.resolve(relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content, 'utf8')
  }

  async listDirectory(relativePath = '.'): Promise<{ name: string; type: 'file' | 'directory' }[]> {
    const entries = await fs.readdir(this.resolve(relativePath), { withFileTypes: true })
    return entries.map(entry => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' }))
  }

  async deleteFile(relativePath: string): Promise<void> { await fs.unlink(this.resolve(relativePath)) }

  async moveFile(from: string, to: string): Promise<void> {
    const target = this.resolve(to)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.rename(this.resolve(from), target)
  }

  async copyFile(from: string, to: string): Promise<void> {
    const target = this.resolve(to)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.copyFile(this.resolve(from), target)
  }

  async editFile(relativePath: string, find: string, replace: string): Promise<void> {
    const content = await this.readFile(relativePath, 1_000_000)
    if (!content.includes(find)) throw new Error('Target text was not found')
    await this.writeFile(relativePath, content.replace(find, replace))
  }

  async glob(pattern: string, maxResults = 500): Promise<string[]> {
    const files = await this.walk(this.workspaceRoot)
    const normalized = pattern.replaceAll('\\', '/')
    const expression = normalized
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replaceAll('**', '§DOUBLESTAR§')
      .replaceAll('*', '[^/]*')
      .replaceAll('§DOUBLESTAR§', '.*')
    const regex = new RegExp(`^${expression}$`)
    return files
      .map(file => path.relative(this.workspaceRoot, file).replaceAll('\\', '/'))
      .filter(file => regex.test(file))
      .slice(0, maxResults)
  }

  async grep(relativePath: string, pattern: string, caseSensitive = false, maxResults = 500): Promise<string[]> {
    const root = this.resolve(relativePath)
    const files = await this.walk(root)
    const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
    const matches: string[] = []
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      regex.lastIndex = 0
      if (regex.test(content)) matches.push(path.relative(this.workspaceRoot, file).replaceAll('\\', '/'))
      if (matches.length >= maxResults) break
    }
    return matches
  }

  private async walk(directory: string): Promise<string[]> {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) files.push(...await this.walk(fullPath))
      else files.push(fullPath)
    }
    return files
  }
}
