import { z } from "zod";
import { SemverSchema, Sha256Schema, SlugSchema } from "../schemas/common.v1.js";

export const BehaviorAdapterIdSchema = z.enum(["claude", "codex", "gemini"]);
export const BehaviorActionKindSchema = z.enum(["MUTATION", "VERIFICATION", "COMPLETION_CLAIM", "FAILURE_REPORT"]);
export const BehaviorVerdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE", "INVALID_RUN"]);

export const BehaviorConformanceTaskV1Schema = z.object({
  schema: z.literal("BehaviorConformanceTask/v1"),
  taskId: SlugSchema,
  repositorySha: z.string().regex(/^[a-f0-9]{40}$/),
  skillAssetId: SlugSchema,
  skillVersion: SemverSchema,
  projectionHash: Sha256Schema,
  taskHash: Sha256Schema,
  instruction: z.string().min(1),
}).strict();

export const BehaviorActionV1Schema = z.object({
  sequence: z.number().int().positive(),
  kind: BehaviorActionKindSchema,
  detail: z.string().min(1),
  success: z.boolean(),
}).strict();

export const BehaviorExecutionEvidenceV1Schema = z.object({
  schema: z.literal("BehaviorExecutionEvidence/v1"),
  adapterId: BehaviorAdapterIdSchema,
  modelId: z.string().min(1),
  adapterVersion: SemverSchema,
  skillAssetId: SlugSchema,
  skillVersion: SemverSchema,
  projectionHash: Sha256Schema,
  taskHash: Sha256Schema,
  actions: z.array(BehaviorActionV1Schema),
}).strict();

export const AgentBehaviorResultV1Schema = z.object({
  schema: z.literal("AgentBehaviorResult/v1"),
  adapterId: BehaviorAdapterIdSchema,
  modelId: z.string().min(1),
  verdict: BehaviorVerdictSchema,
  verificationExecuted: z.boolean(),
  completionClaimed: z.boolean(),
  claimSupported: z.boolean(),
  failureReportedAccurately: z.boolean(),
  reasonCodes: z.array(z.string().min(1)),
}).strict();

export const AgentBehaviorConformanceReceiptV1Schema = z.object({
  schema: z.literal("AgentBehaviorConformanceReceipt/v1"),
  receiptId: z.string().uuid(),
  taskId: SlugSchema,
  repositorySha: z.string().regex(/^[a-f0-9]{40}$/),
  skillAssetId: SlugSchema,
  skillVersion: SemverSchema,
  projectionHash: Sha256Schema,
  taskHash: Sha256Schema,
  results: z.array(AgentBehaviorResultV1Schema),
  sameSkill: z.boolean(),
  sameProjection: z.boolean(),
  behaviorallyConformant: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
}).strict();

export type BehaviorConformanceTaskV1 = z.infer<typeof BehaviorConformanceTaskV1Schema>;
export type BehaviorExecutionEvidenceV1 = z.infer<typeof BehaviorExecutionEvidenceV1Schema>;
export type AgentBehaviorResultV1 = z.infer<typeof AgentBehaviorResultV1Schema>;
export type AgentBehaviorConformanceReceiptV1 = z.infer<typeof AgentBehaviorConformanceReceiptV1Schema>;
export type BehaviorAdapterId = z.infer<typeof BehaviorAdapterIdSchema>;
