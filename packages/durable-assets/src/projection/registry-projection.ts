import { sha256Canonical } from "../integrity/canonical-hash.js";
import { DurableAssetRegistryV1Schema, type DurableAssetRegistryV1 } from "../schemas/registry.v1.js";
import type { PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import { createEmptyRegistry, reducePromotionEvent } from "../reducer/promotion-reducer.js";

export interface ProjectionResult {
  registry: DurableAssetRegistryV1;
  receipts: ReturnType<typeof reducePromotionEvent>["receipt"][];
  projectionHash: `sha256:${string}`;
  eventCount: number;
  lastEventId: string | null;
}

export function projectRegistry(events: readonly PromotionEventV1[]): ProjectionResult {
  if (events.length === 0) {
    const registry = createEmptyRegistry("1970-01-01T00:00:00.000Z");
    return {
      registry,
      receipts: [],
      projectionHash: sha256Canonical(registry),
      eventCount: 0,
      lastEventId: null,
    };
  }

  const ordered = [...events].sort((a, b) => {
    const time = a.occurredAt.localeCompare(b.occurredAt);
    return time !== 0 ? time : a.eventId.localeCompare(b.eventId);
  });

  let registry = createEmptyRegistry(ordered[0]!.occurredAt);
  const receipts: ProjectionResult["receipts"] = [];
  for (const event of ordered) {
    const result = reducePromotionEvent(registry, event);
    registry = result.state;
    if (result.receipt) receipts.push(result.receipt);
  }

  const validated = DurableAssetRegistryV1Schema.parse(registry);
  return {
    registry: validated,
    receipts,
    projectionHash: sha256Canonical(validated),
    eventCount: ordered.length,
    lastEventId: ordered.at(-1)?.eventId ?? null,
  };
}
