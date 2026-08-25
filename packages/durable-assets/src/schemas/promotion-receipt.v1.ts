import { z } from "zod";
import {
  DurableAssetTypeSchema,
  EvidenceReferenceSchema,
  IsoDateTimeSchema,
  PromotionDecisionSchema,
  SemverSchema,
  SlugSchema,
  ValidationStatusSchema,
} from "./common.v1.js";

export const PromotionReasonCodeSchema = z.enum([
  "THREE_SESSION_THRESHOLD",
  "EXPLICIT_OPERATOR_PROMOTION",
  "SECURITY_AUTHORITY",
  "COMPLIANCE_AUTHORITY",
  "OPERATOR_AUTHORITY",
  "EXISTING_ASSET_MATCH",
  "INSUFFICIENT_DISTINCT_SESSIONS",
  "TEMPORARY_CONTEXT",
  "LOW_REUSABILITY",
  "POLICY_INVARIANT",
  "EXECUTION_BEHAVIOR",
  "MACHINE_ENFORCEABLE_STRUCTURE",
  "VERIFICATION_BEHAVIOR",
  "REFERENCE_KNOWLEDGE",
  "CONFLICT_REQUIRES_REVIEW",
]);

export const DurableAssetPromotionReceiptV1Schema = z.object({
  schema: z.literal("DurableAssetPromotionReceipt/v1"),
  receiptId: z.string().uuid(),
  patternId: SlugSchema,
  semanticFingerprint: z.string().min(1),
  occurrenceCount: z.number().int().nonnegative(),
  distinctSessionCount: z.number().int().nonnegative(),
  decision: PromotionDecisionSchema,
  assetType: DurableAssetTypeSchema.nullable(),
  targetAssetId: SlugSchema.nullable(),
  canonicalPath: z.string().min(1).nullable(),
  evidenceRefs: z.array(EvidenceReferenceSchema),
  supersedes: z.array(SlugSchema),
  validationStatus: ValidationStatusSchema,
  reasonCodes: z.array(PromotionReasonCodeSchema).min(1),
  createdAt: IsoDateTimeSchema,
  reducerVersion: SemverSchema,
}).strict().superRefine((receipt, ctx) => {
  const assetProducing = new Set([
    "PROMOTE",
    "MERGE_EXISTING",
    "UPDATE_EXISTING",
    "DOCUMENT_ONLY",
  ]);

  if (assetProducing.has(receipt.decision) && receipt.assetType === null) {
    ctx.addIssue({
      code: "custom",
      path: ["assetType"],
      message: "Asset-producing decisions require assetType.",
    });
  }

  if (receipt.decision === "REJECT" && receipt.canonicalPath !== null) {
    ctx.addIssue({
      code: "custom",
      path: ["canonicalPath"],
      message: "Rejected candidates cannot have a canonical path.",
    });
  }

  if (receipt.reasonCodes.includes("THREE_SESSION_THRESHOLD") && receipt.distinctSessionCount < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["distinctSessionCount"],
      message: "Three-session threshold requires three distinct sessions.",
    });
  }
});

export type DurableAssetPromotionReceiptV1 = z.infer<typeof DurableAssetPromotionReceiptV1Schema>;
