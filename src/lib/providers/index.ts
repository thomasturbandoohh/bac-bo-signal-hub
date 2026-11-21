import { lynxMetricsProvider } from "./lynxmetrics";
import type { LiveProvider, ProviderId, ProviderInfo } from "./types";

const registry: Record<ProviderId, LiveProvider> = {
  lynxmetrics: lynxMetricsProvider,
};

/** Lista para o select do painel admin. */
export const PROVIDER_LIST: ProviderInfo[] = Object.values(registry).map((p) => p.info);

export function getProvider(id: string | null | undefined): LiveProvider {
  if (id && id in registry) return registry[id as ProviderId];
  return registry.lynxmetrics;
}

export function isProviderId(id: string): id is ProviderId {
  return id in registry;
}

export type { LiveProvider, ProviderId, ProviderInfo, FetchPageResult } from "./types";
