import { z } from "zod";
import { DurableAssetTypeSchema, IsoDateTimeSchema, Sha256Schema, SlugSchema } from "./common.v1.js";
import { GitCommitShaSchema, RegistryCheckpointV1Schema } from "./integrity.v1.js";
import { DurableAssetRegistryV1Schema } from "./registry.v1.js";

export const SigningAlgorithmSchema = z.enum(["Ed25519", "ECDSA_P256_SHA256", "RSA_PSS_SHA256"]);
export const SignatureVerdictSchema = z.enum(["TRUSTED", "INVALID_SIGNATURE", "UNKNOWN_KEY", "REVOKED_KEY", "ALGORITHM_NOT_ALLOWED", "FINGERPRINT_MISMATCH"]);
export const SignedRegistryCheckpointV1Schema = z.object({ schema: z.literal("SignedRegistryCheckpoint/v1"), checkpoint: RegistryCheckpointV1Schema, signingAlgorithm: SigningAlgorithmSchema, keyId: z.string().min(1), publicKeyFingerprint: Sha256Schema, signedPayloadHash: Sha256Schema, signature: z.string().min(1), signedAt: IsoDateTimeSchema }).strict();
export const RegistryProjectionSnapshotV1Schema = z.object({ schema: z.literal("RegistryProjectionSnapshot/v1"), snapshotId: z.string().uuid(), checkpointId: z.string().uuid(), registry: DurableAssetRegistryV1Schema, projectionHash: Sha256Schema, registryRevision: z.number().int().nonnegative(), eventCount: z.number().int().nonnegative(), cursor: z.object({ occurredAt: IsoDateTimeSchema.nullable(), eventId: z.string().uuid().nullable() }).strict(), snapshotHash: Sha256Schema, createdAt: IsoDateTimeSchema }).strict();
export const MaterializationVerificationVerdictSchema = z.enum(["VERIFIED", "COMMIT_NOT_FOUND", "PATH_NOT_FOUND", "HASH_MISMATCH", "INVALID_PATH", "GIT_ERROR"]);
export const MaterializationVerificationV1Schema = z.object({ schema: z.literal("MaterializationVerification/v1"), verificationId: z.string().uuid(), receiptId: z.string().uuid(), repositoryCommitSha: GitCommitShaSchema, relativePath: z.string().min(1), expectedAssetHash: Sha256Schema, observedAssetHash: Sha256Schema.nullable(), gitObjectId: z.string().nullable(), verifiedAt: IsoDateTimeSchema, verdict: MaterializationVerificationVerdictSchema }).strict();
const AuthorityGrantSchema = z.object({ kind: z.enum(["SECURITY", "COMPLIANCE", "OPERATOR"]), assetTypes: z.array(DurableAssetTypeSchema).min(1) }).strict();
export const AuthorityPolicyV1Schema = z.object({ schema: z.literal("AuthorityPolicy/v1"), policyId: SlugSchema, revision: z.number().int().positive(), createdAt: IsoDateTimeSchema, principals: z.array(z.object({ principalId: SlugSchema, identities: z.array(z.string().min(1)).min(1), authorities: z.array(AuthorityGrantSchema).min(1) }).strict()), policyHash: Sha256Schema }).strict();
export const CrossAgentConformanceManifestV1Schema = z.object({ schema: z.literal("CrossAgentConformanceManifest/v1"), projectionHash: Sha256Schema, adapters: z.array(z.enum(["claude", "codex", "gemini"])), passed: z.boolean(), assetSetHashes: z.array(Sha256Schema) }).strict();

export type SigningAlgorithm = z.infer<typeof SigningAlgorithmSchema>;
export type SignatureVerdict = z.infer<typeof SignatureVerdictSchema>;
export type SignedRegistryCheckpointV1 = z.infer<typeof SignedRegistryCheckpointV1Schema>;
export type RegistryProjectionSnapshotV1 = z.infer<typeof RegistryProjectionSnapshotV1Schema>;
export type MaterializationVerificationV1 = z.infer<typeof MaterializationVerificationV1Schema>;
export type AuthorityPolicyV1 = z.infer<typeof AuthorityPolicyV1Schema>;
