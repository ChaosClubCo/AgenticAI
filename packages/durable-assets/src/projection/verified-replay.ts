import { sha256Canonical } from "../integrity/canonical-hash.js";
import { RegistryCheckpointV1Schema, type RegistryCheckpointV1 } from "../schemas/integrity.v1.js";
import { RegistryProjectionSnapshotV1Schema, type RegistryProjectionSnapshotV1 } from "../schemas/trust.v1.js";
import type { PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import { DurableAssetRegistryV1Schema } from "../schemas/registry.v1.js";
import { reducePromotionEvent } from "../reducer/promotion-reducer.js";
import type { ProjectionResult } from "./registry-projection.js";

export function createProjectionSnapshot(projection: ProjectionResult, checkpoint: RegistryCheckpointV1, snapshotId: string, createdAt: string): RegistryProjectionSnapshotV1 {
  const cp = RegistryCheckpointV1Schema.parse(checkpoint); if (cp.projectionHash !== projection.projectionHash || cp.eventCount !== projection.eventCount || cp.registryRevision !== projection.registry.revision) throw new Error("Checkpoint does not bind projection.");
  const payload = { schema: "RegistryProjectionSnapshot/v1" as const, snapshotId, checkpointId: cp.checkpointId, registry: projection.registry, projectionHash: projection.projectionHash, registryRevision: projection.registry.revision, eventCount: projection.eventCount, cursor: { occurredAt: projection.registry.updatedAt, eventId: projection.lastEventId }, createdAt };
  return RegistryProjectionSnapshotV1Schema.parse({ ...payload, snapshotHash: sha256Canonical(payload) });
}
export function verifyProjectionSnapshot(snapshot: RegistryProjectionSnapshotV1, checkpoint: RegistryCheckpointV1): boolean {
  const parsed = RegistryProjectionSnapshotV1Schema.parse(snapshot); const { snapshotHash, ...payload } = parsed; const cp = RegistryCheckpointV1Schema.parse(checkpoint);
  return sha256Canonical(payload) === snapshotHash && sha256Canonical(parsed.registry) === parsed.projectionHash && cp.checkpointId === parsed.checkpointId && cp.projectionHash === parsed.projectionHash && cp.registryRevision === parsed.registryRevision && cp.eventCount === parsed.eventCount && cp.lastEventId === parsed.cursor.eventId;
}
export function projectRegistryFromVerifiedSnapshot(snapshot: RegistryProjectionSnapshotV1, checkpoint: RegistryCheckpointV1, trailingEvents: readonly PromotionEventV1[]): ProjectionResult {
  if (!verifyProjectionSnapshot(snapshot, checkpoint)) throw new Error("Unverified projection snapshot.");
  const ordered = [...trailingEvents].sort((a,b) => a.occurredAt.localeCompare(b.occurredAt) || a.eventId.localeCompare(b.eventId));
  if (snapshot.cursor.occurredAt && ordered.some(e => e.occurredAt < snapshot.cursor.occurredAt || (e.occurredAt === snapshot.cursor.occurredAt && snapshot.cursor.eventId && e.eventId <= snapshot.cursor.eventId))) throw new Error("Trailing event is not strictly after snapshot cursor.");
  let registry = snapshot.registry; const receipts: ProjectionResult["receipts"] = [];
  for (const event of ordered) { const result = reducePromotionEvent(registry, event); registry = result.state; if (result.receipt) receipts.push(result.receipt); }
  const validated = DurableAssetRegistryV1Schema.parse(registry); return { registry: validated, receipts, projectionHash: sha256Canonical(validated), eventCount: snapshot.eventCount + ordered.length, lastEventId: ordered.at(-1)?.eventId ?? snapshot.cursor.eventId };
}
