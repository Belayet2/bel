import type { ToolDefinition } from '../tools/types'

export type ApprovalDecision = 'allow' | 'approve' | 'deny'

export interface ApprovalRequest {
  readonly toolName: string
  readonly input: unknown
  readonly risk: 'safe' | 'risky' | 'destructive'
}

export interface ApprovalGate {
  evaluate(request: ApprovalRequest): ApprovalDecision
}

export class SimpleSafetyPolicy implements ApprovalGate {
  constructor(private readonly tools: ReadonlyMap<string, ToolDefinition>) {}

  evaluate(request: ApprovalRequest): ApprovalDecision {
    const tool = this.tools.get(request.toolName)
    const risk = tool?.risk ?? request.risk

    if (tool?.requiresApproval === true || risk === 'destructive') return 'approve'
    if (risk === 'risky') return 'approve'

    if (this.isDangerousCommand(request.input)) return 'deny'

    if (this.isDangerousPath(request.input)) return 'deny'

    return 'allow'
  }

  private isDangerousCommand(input: unknown): boolean {
    if (typeof input !== 'object' || input === null) return false
    const record = input as Record<string, unknown>
    const command = typeof record.command === 'string' ? record.command : ''
    if (!command) return false
    const normalized = command.toLowerCase()
    return /(rm\s+-rf|sudo\s+|curl\s+\S+\s+\|\s*(bash|sh)|chmod\s+[0-7]*[7-9]|mkfs|dd\s+if=|shutdown|reboot)/.test(normalized)
  }

  private isDangerousPath(input: unknown): boolean {
    if (typeof input !== 'object' || input === null) return false
    const record = input as Record<string, unknown>
    const pathValue = typeof record.path === 'string' ? record.path : typeof record.from === 'string' ? record.from : typeof record.to === 'string' ? record.to : ''
    if (!pathValue) return false
    const normalized = pathValue.replace(/\\/g, '/')
    return normalized.startsWith('../') || normalized.includes('/../') || normalized === '..' || normalized.includes('..')
  }
}

export function createSafetyPolicy(tools: ReadonlyMap<string, ToolDefinition>): ApprovalGate {
  return new SimpleSafetyPolicy(tools)
}
