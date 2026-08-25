import type { ProjectionResult } from "./registry-projection.js";
import {
  RegistryCheckpointV1Schema,
  type RegistryCheckpointV1,
} from "../schemas/integrity.v1.js";
import { sha256Canonical } from "../integrity/canonical-hash.js";

export interface CreateRegistryCheckpointOptions {
  checkpointId: string;
  createdAt: string;
  previousCheckpointHash: RegistryCheckpointV1["previousCheckpointHash"];
}

export function createRegistryCheckpoint(
  projection: ProjectionResult,
  options: CreateRegistryCheckpointOptions,
): RegistryCheckpointV1 {
  const base = {
    schema: "RegistryCheckpoint/v1" as const,
    checkpointId: options.checkpointId,
    createdAt: options.createdAt,
    eventCount: projection.eventCount,
    lastEventId: projection.lastEventId,
    registryRevision: projection.registry.revision,
    projectionHash: projection.projectionHash,
    previousCheckpointHash: options.previousCheckpointHash,
  };

  return RegistryCheckpointV1Schema.parse({
    ...base,
    checkpointHash: sha256Canonical(base),
  });
}

export function verifyRegistryCheckpoint(checkpoint: RegistryCheckpointV1): boolean {
  const validated = RegistryCheckpointV1Schema.parse(checkpoint);
  const { checkpointHash, ...base } = validated;
  return sha256Canonical(base) === checkpointHash;
}

export function verifyRegistryCheckpointChain(checkpoints: readonly RegistryCheckpointV1[]): boolean {
  let previous: RegistryCheckpointV1 | undefined;
  for (const checkpoint of checkpoints) {
    if (!verifyRegistryCheckpoint(checkpoint)) return false;
    if (checkpoint.previousCheckpointHash !== (previous?.checkpointHash ?? null)) return false;
    previous = checkpoint;
  }
  return true;
}
