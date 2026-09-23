import { InMemoryToolRegistry } from '../tools/registry'
import type { AgentLoop } from '../agent/loop'
import { filesystemRuntimePlugin } from '../plugins/filesystem-runtime-plugin'
import { shellRuntimePlugin } from '../plugins/shell-runtime-plugin'
import { gitPlugin } from '../plugins/git-plugin'
import { SimplePluginRuntime, type PluginRuntimeOptions } from '../plugins/runtime'

export interface BelRuntime extends SimplePluginRuntime {
  readonly agentLoop?: AgentLoop
}

/** Create the default host composition for the Bel application. */
export async function createBelRuntime(options: PluginRuntimeOptions = {}): Promise<BelRuntime> {
  const runtime = new SimplePluginRuntime(new InMemoryToolRegistry(), options) as BelRuntime
  await runtime.mount(filesystemRuntimePlugin)
  await runtime.mount(shellRuntimePlugin)
  await runtime.mount(gitPlugin)
  return runtime
}
