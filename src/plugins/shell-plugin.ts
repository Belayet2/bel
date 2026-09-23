import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export type JobStatus = 'running' | 'completed' | 'failed' | 'killed'

export interface JobRecord {
  id: string
  command: string
  pid: number | null
  status: JobStatus
  stdout: string
  stderr: string
  startedAt: string
  finishedAt?: string
  exitCode?: number | null
  signal?: string
}

export interface ShellCommandResult {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export class ShellService {
  private readonly jobs = new Map<string, JobRecord>()

  constructor(private readonly workspaceRoot: string = process.cwd()) {}

  runCommand(command: string, options: { timeoutMs?: number; maxOutputBytes?: number } = {}): Promise<ShellCommandResult> {
    const timeoutMs = options.timeoutMs ?? 30000
    const maxOutputBytes = options.maxOutputBytes ?? 200000

    return new Promise((resolve) => {
      const child: ChildProcessWithoutNullStreams = spawn(command, {
        cwd: this.workspaceRoot,
        shell: true,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''
      let timedOut = false
      let finished = false

      const truncate = (value: string): string => value.length > maxOutputBytes ? value.slice(-maxOutputBytes) : value

      const finish = (exitCode: number | null, signal?: string): void => {
        if (finished) return
        finished = true
        resolve({ exitCode, stdout: truncate(stdout), stderr: truncate(stderr), timedOut })
      }

      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString()
        if (stdout.length > maxOutputBytes) stdout = truncate(stdout)
      })

      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString()
        if (stderr.length > maxOutputBytes) stderr = truncate(stderr)
      })

      const timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
      }, timeoutMs)

      child.on('close', (code, signal) => {
        clearTimeout(timeout)
        finish(code, signal ?? undefined)
      })

      child.on('error', () => {
        clearTimeout(timeout)
        finish(null, 'error')
      })
    })
  }

  startBackground(command: string): JobRecord {
    const jobId = `job-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const child = spawn(command, {
      cwd: this.workspaceRoot,
      shell: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const record: JobRecord = {
      id: jobId,
      command,
      pid: child.pid ?? null,
      status: 'running',
      stdout: '',
      stderr: '',
      startedAt: new Date().toISOString(),
    }

    child.stdout.on('data', (chunk: Buffer | string) => {
      record.stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk: Buffer | string) => {
      record.stderr += chunk.toString()
    })

    child.on('close', (code, signal) => {
      record.status = code === 0 ? 'completed' : (signal ? 'killed' : 'failed')
      record.finishedAt = new Date().toISOString()
      record.exitCode = code
      record.signal = signal ?? undefined
    })

    child.on('error', () => {
      record.status = 'failed'
      record.finishedAt = new Date().toISOString()
    })

    this.jobs.set(jobId, record)
    return record
  }

  readJobOutput(jobId: string): JobRecord | undefined {
    return this.jobs.get(jobId)
  }

  killJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job || job.pid === null) return false
    if (job.status !== 'running') return false

    try {
      process.kill(job.pid, 'SIGTERM')
      job.status = 'killed'
      job.finishedAt = new Date().toISOString()
      job.signal = 'SIGTERM'
      return true
    } catch {
      return false
    }
  }
}
