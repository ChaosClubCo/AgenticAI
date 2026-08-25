import { z } from "zod";
import {
  EvidenceReferenceSchema,
  SlugSchema,
} from "./common.v1.js";

export const DurableAssetObservationV1Schema = z.object({
  schema: z.literal("DurableAssetObservation/v1"),
  patternId: SlugSchema,
  semanticFingerprint: z.string().min(1),
  evidence: EvidenceReferenceSchema,
  reusable: z.boolean(),
  temporaryContext: z.boolean(),
  proposedAssetType: z.enum([
    "SKILL",
    "POLICY",
    "SOP",
    "SCHEMA",
    "CONTRACT",
    "TEST",
    "EVALUATION",
    "DOCUMENTATION",
  ]).nullable().default(null),
}).strict();

export type DurableAssetObservationV1 = z.infer<typeof DurableAssetObservationV1Schema>;
