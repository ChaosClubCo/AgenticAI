import { z } from "zod";
import {
  DurableAssetLifecycleSchema,
  DurableAssetTypeSchema,
  EvidenceReferenceSchema,
  IsoDateTimeSchema,
  SlugSchema,
} from "./common.v1.js";

const EventBaseSchema = z.object({
  schema: z.literal("PromotionEvent/v1"),
  eventId: z.string().uuid(),
  occurredAt: IsoDateTimeSchema,
  actorId: z.string().min(1),
}).strict();

export const PromotionEventV1Schema = z.discriminatedUnion("type", [
  EventBaseSchema.extend({
    type: z.literal("PATTERN_OBSERVED"),
    patternId: SlugSchema,
    semanticFingerprint: z.string().min(1),
    evidence: EvidenceReferenceSchema,
    reusable: z.boolean(),
    temporaryContext: z.boolean(),
    proposedAssetType: DurableAssetTypeSchema.nullable(),
  }),
  EventBaseSchema.extend({
    type: z.literal("PROMOTION_CLASSIFIED"),
    patternId: SlugSchema,
    proposedAssetType: DurableAssetTypeSchema,
  }),
  EventBaseSchema.extend({
    type: z.literal("EXISTING_ASSET_MATCHED"),
    patternId: SlugSchema,
    assetId: SlugSchema,
    similarity: z.number().min(0).max(1),
  }),
  EventBaseSchema.extend({
    type: z.literal("ASSET_PROMOTED"),
    assetId: SlugSchema,
    patternId: SlugSchema,
    assetType: DurableAssetTypeSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    canonicalPath: z.string().min(1),
    description: z.string().min(1),
  }),
  EventBaseSchema.extend({
    type: z.literal("LIFECYCLE_TRANSITION_REQUESTED"),
    assetId: SlugSchema,
    to: DurableAssetLifecycleSchema,
  }),
]);

export type PromotionEventV1 = z.infer<typeof PromotionEventV1Schema>;
