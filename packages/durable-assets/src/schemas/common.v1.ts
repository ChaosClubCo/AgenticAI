import { z } from "zod";

export const IsoDateTimeSchema = z.string().datetime({ offset: true });
export const Sha256Schema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export const SlugSchema = z.string().min(3).max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

export const DurableAssetTypeSchema = z.enum([
  "SKILL",
  "POLICY",
  "SOP",
  "SCHEMA",
  "CONTRACT",
  "TEST",
  "EVALUATION",
  "DOCUMENTATION",
]);

export const DurableAssetLifecycleSchema = z.enum([
  "CANDIDATE",
  "PROMOTED",
  "TESTED",
  "VERIFIED",
  "ACTIVE",
  "DEPRECATED",
]);

export const PromotionDecisionSchema = z.enum([
  "PROMOTE",
  "MERGE_EXISTING",
  "UPDATE_EXISTING",
  "DOCUMENT_ONLY",
  "REJECT",
]);

export const ValidationStatusSchema = z.enum(["PENDING", "PASSED", "FAILED"]);

export const EvidenceReferenceSchema = z.object({
  sessionId: z.string().min(1),
  occurrenceId: z.string().min(1),
  observedAt: IsoDateTimeSchema,
  contentHash: Sha256Schema,
  sourceRef: z.string().min(1).optional(),
}).strict();

export type DurableAssetType = z.infer<typeof DurableAssetTypeSchema>;
export type DurableAssetLifecycle = z.infer<typeof DurableAssetLifecycleSchema>;
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;
