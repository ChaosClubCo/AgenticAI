import { z } from "zod";
import {
  DurableAssetLifecycleSchema,
  DurableAssetTypeSchema,
  EvidenceReferenceSchema,
  IsoDateTimeSchema,
  SemverSchema,
  SlugSchema,
} from "./common.v1.js";
import { PromotionAuthoritySchema } from "./integrity.v1.js";

export const RegistryTestSchema = z.object({
  id: SlugSchema,
  type: z.enum([
    "POSITIVE_TRIGGER",
    "NEGATIVE_TRIGGER",
    "AMBIGUOUS_TRIGGER",
    "OUTPUT_CONTRACT",
    "FAILURE_PATH",
    "SECURITY",
  ]),
  status: z.enum(["PENDING", "PASSED", "FAILED"]),
}).strict();

export const DurableAssetRegistryEntryV1Schema = z.object({
  assetId: SlugSchema,
  patternId: SlugSchema,
  type: DurableAssetTypeSchema,
  version: SemverSchema,
  lifecycle: DurableAssetLifecycleSchema,
  canonicalPath: z.string().min(1),
  semanticFingerprint: z.string().min(1),
  description: z.string().min(1),
  activation: z.object({
    triggers: z.array(z.string().min(1)),
    exclusions: z.array(z.string().min(1)),
  }).strict(),
  evidenceRefs: z.array(EvidenceReferenceSchema),
  tests: z.array(RegistryTestSchema),
  promotionAuthority: PromotionAuthoritySchema.nullable(),
  mergedPatternIds: z.array(SlugSchema),
  supersedes: z.array(SlugSchema),
  supersededBy: SlugSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
}).strict();

export const DurableAssetCandidateV1Schema = z.object({
  patternId: SlugSchema,
  semanticFingerprint: z.string().min(1),
  evidenceRefs: z.array(EvidenceReferenceSchema),
  occurrenceCount: z.number().int().nonnegative(),
  distinctSessionCount: z.number().int().nonnegative(),
  firstSeenAt: IsoDateTimeSchema,
  lastSeenAt: IsoDateTimeSchema,
  proposedAssetType: DurableAssetTypeSchema.nullable(),
  existingAssetMatches: z.array(z.object({
    assetId: SlugSchema,
    similarity: z.number().min(0).max(1),
  }).strict()),
  temporaryContext: z.boolean(),
  reusable: z.boolean(),
  mergedIntoAssetId: SlugSchema.nullable(),
}).strict();

export const DurableAssetRegistryV1Schema = z.object({
  schema: z.literal("DurableAssetRegistry/v1"),
  revision: z.number().int().nonnegative(),
  processedEventIds: z.array(z.string().uuid()),
  candidates: z.record(SlugSchema, DurableAssetCandidateV1Schema),
  assets: z.record(SlugSchema, DurableAssetRegistryEntryV1Schema),
  updatedAt: IsoDateTimeSchema,
}).strict();

export type DurableAssetRegistryEntryV1 = z.infer<typeof DurableAssetRegistryEntryV1Schema>;
export type DurableAssetCandidateV1 = z.infer<typeof DurableAssetCandidateV1Schema>;
export type DurableAssetRegistryV1 = z.infer<typeof DurableAssetRegistryV1Schema>;
