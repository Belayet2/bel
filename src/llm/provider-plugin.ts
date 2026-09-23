import type { BelPlugin, BelPluginContext } from './types'
import type { LlmProvider } from '../llm/types'

export interface ProviderContext extends BelPluginContext {
  readonly providers: Map<string, LlmProvider>
}

export interface ProviderPlugin extends BelPlugin {
  setup(context: ProviderContext): void | Promise<void>
}

export function createProviderRegistryPlugin(providers: readonly LlmProvider[]): ProviderPlugin {
  return {
    name: 'bel-llm-providers',
    setup(context) {
      for (const provider of providers) context.providers.set(provider.name, provider)
      context.registerCleanup(() => {
        for (const provider of providers) {
          if (context.providers.get(provider.name) === provider) context.providers.delete(provider.name)
        }
      })
    },
  }
}
