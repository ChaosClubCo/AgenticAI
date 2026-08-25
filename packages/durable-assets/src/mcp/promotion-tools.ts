import { randomUUID } from "node:crypto";
import type { DurableAssetType, EvidenceReference } from "../schemas/common.v1.js";
import type { PromotionAuthorityKind, RegistryCheckpointV1 } from "../schemas/integrity.v1.js";
import { PromotionEventV1Schema, type PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import { createRegistryCheckpoint } from "../projection/registry-checkpoint.js";
import { projectRegistry } from "../projection/registry-projection.js";

export interface DurableAssetsToolHandlerOptions {
  actorId: string;
  authorityKind?: PromotionAuthorityKind;
  appendEvent: (event: PromotionEventV1) => Promise<void>;
  listEvents: () => Promise<PromotionEventV1[]>;
  appendCheckpoint?: (checkpoint: RegistryCheckpointV1) => Promise<void>;
  listCheckpoints?: () => Promise<RegistryCheckpointV1[]>;
  now?: () => string;
  uuid?: () => string;
}

export interface AuthorityPromotionInput {
  assetId: string;
  patternId: string;
  assetType: DurableAssetType;
  version: string;
  canonicalPath: string;
  description: string;
  semanticFingerprint: string;
  authorityRef: string;
  evidenceRefs: EvidenceReference[];
}

export function createDurableAssetsToolHandlers(options: DurableAssetsToolHandlerOptions) {
  const now = options.now ?? (() => new Date().toISOString());
  const uuid = options.uuid ?? randomUUID;

  return {
    recordObservation: async (input: {
      patternId: string;
      semanticFingerprint: string;
      evidence: EvidenceReference;
      reusable: boolean;
      temporaryContext: boolean;
      proposedAssetType: DurableAssetType | null;
    }) => {
      const event = PromotionEventV1Schema.parse({
        schema: "PromotionEvent/v1",
        eventId: uuid(),
        occurredAt: now(),
        actorId: options.actorId,
        type: "PATTERN_OBSERVED",
        ...input,
      });
      await options.appendEvent(event);
      return { event };
    },

    authorizePromotion: async (input: AuthorityPromotionInput) => {
      if (!options.authorityKind) throw new Error("This MCP boundary has no promotion authority configured.");
      const type = `${options.authorityKind}_PROMOTION_AUTHORIZED` as const;
      const event = PromotionEventV1Schema.parse({
        schema: "PromotionEvent/v1",
        eventId: uuid(),
        occurredAt: now(),
        actorId: options.actorId,
        type,
        ...input,
      });
      await options.appendEvent(event);
      return { event };
    },

    mergeExisting: async (input: { patternId: string; targetAssetId: string }) => {
      const event = PromotionEventV1Schema.parse({
        schema: "PromotionEvent/v1",
        eventId: uuid(),
        occurredAt: now(),
        actorId: options.actorId,
        type: "ASSET_MERGED",
        ...input,
      });
      await options.appendEvent(event);
      return { event };
    },

    supersedeVersion: async (input: {
      previousAssetId: string;
      assetId: string;
      version: string;
      canonicalPath: string;
      description: string;
      semanticFingerprint: string;
      evidenceRefs: EvidenceReference[];
    }) => {
      const event = PromotionEventV1Schema.parse({
        schema: "PromotionEvent/v1",
        eventId: uuid(),
        occurredAt: now(),
        actorId: options.actorId,
        type: "ASSET_VERSION_SUPERSEDED",
        ...input,
      });
      await options.appendEvent(event);
      return { event };
    },

    projectRegistry: async () => projectRegistry(await options.listEvents()),

    createCheckpoint: async () => {
      if (!options.appendCheckpoint || !options.listCheckpoints) {
        throw new Error("Checkpoint persistence is not configured for this MCP boundary.");
      }
      const projection = projectRegistry(await options.listEvents());
      const existing = await options.listCheckpoints();
      const previousCheckpointHash = existing.at(-1)?.checkpointHash ?? null;
      const checkpoint = createRegistryCheckpoint(projection, {
        checkpointId: uuid(),
        createdAt: now(),
        previousCheckpointHash,
      });
      await options.appendCheckpoint(checkpoint);
      return { checkpoint };
    },
  };
}
