// ── Broker Integration Framework — Adapter Registry ──
// Central registry for broker adapters. Adapters register themselves
// on import (side-effect registration) and the registry provides
// lookups by id, name, and capabilities queries.

import type { BrokerAdapter, BrokerCapabilities, BrokerCategory } from "./types";

export class BrokerRegistry {
  private adapters: Map<string, BrokerAdapter> = new Map();

  /** Register a broker adapter. Overwrites if id already exists. */
  register(adapter: BrokerAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  /** Unregister an adapter by id. */
  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  /** Look up an adapter by its id (e.g. "binance", "kraken"). */
  lookup(id: string): BrokerAdapter | undefined {
    return this.adapters.get(id);
  }

  /** Look up an adapter by its display name (e.g. "Binance"). */
  lookupByName(name: string): BrokerAdapter | undefined {
    const lower = name.toLowerCase();
    for (const adapter of this.adapters.values()) {
      if (adapter.name.toLowerCase() === lower) {
        return adapter;
      }
    }
    return undefined;
  }

  /** Return all registered adapters. */
  listAll(): BrokerAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** Return all registered adapter ids. */
  listIds(): string[] {
    return Array.from(this.adapters.keys());
  }

  /** Return adapters filtered by category. */
  listByCategory(category: BrokerCategory): BrokerAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (a) => a.category === category,
    );
  }

  /** Find adapters that support a given capability. */
  listByCapability(
    capability: keyof BrokerCapabilities,
  ): BrokerAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (a) => a.getCapabilities()[capability] === true,
    );
  }

  /** Find adapters that support a given order type. */
  listByOrderType(
    orderType: BrokerCapabilities["supportedOrderTypes"][number],
  ): BrokerAdapter[] {
    return Array.from(this.adapters.values()).filter((a) =>
      a.getCapabilities().supportedOrderTypes.includes(orderType),
    );
  }

  /** Return the number of registered adapters. */
  get size(): number {
    return this.adapters.size;
  }

  /** Clear all registered adapters (useful for testing). */
  clear(): void {
    this.adapters.clear();
  }
}

/** Singleton registry instance — shared across the application. */
export const brokerRegistry = new BrokerRegistry();

/** Convenience: register multiple adapters at once. */
export function registerAdapters(adapters: BrokerAdapter[]): void {
  for (const adapter of adapters) {
    brokerRegistry.register(adapter);
  }
}
