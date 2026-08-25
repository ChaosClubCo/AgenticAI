import { z } from "zod";
import { IsoDateTimeSchema, SemverSchema, Sha256Schema, SlugSchema } from "./common.v1.js";

export const PromotionAuthorityKindSchema = z.enum(["SECURITY", "COMPLIANCE", "OPERATOR"]);

export const PromotionAuthoritySchema = z.object({
  kind: PromotionAuthorityKindSchema,
  authorityRef: z.string().min(1).max(512),
  actorId: z.string().min(1).max(256),
}).strict();

export const GitCommitShaSchema = z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);

export const RegistryCheckpointV1Schema = z.object({
  schema: z.literal("RegistryCheckpoint/v1"),
  checkpointId: z.string().uuid(),
  createdAt: IsoDateTimeSchema,
  eventCount: z.number().int().nonnegative(),
  lastEventId: z.string().uuid().nullable(),
  registryRevision: z.number().int().nonnegative(),
  projectionHash: Sha256Schema,
  previousCheckpointHash: Sha256Schema.nullable(),
  checkpointHash: Sha256Schema,
}).strict();

export const MaterializationReceiptV1Schema = z.object({
  schema: z.literal("MaterializationReceipt/v1"),
  receiptId: z.string().uuid(),
  assetId: SlugSchema,
  assetVersion: SemverSchema,
  relativePath: z.string().min(1),
  assetHash: Sha256Schema,
  registryProjectionHash: Sha256Schema,
  repositoryCommitSha: GitCommitShaSchema,
  materializedAt: IsoDateTimeSchema,
}).strict();

export type PromotionAuthorityKind = z.infer<typeof PromotionAuthorityKindSchema>;
export type PromotionAuthority = z.infer<typeof PromotionAuthoritySchema>;
export type RegistryCheckpointV1 = z.infer<typeof RegistryCheckpointV1Schema>;
export type MaterializationReceiptV1 = z.infer<typeof MaterializationReceiptV1Schema>;
