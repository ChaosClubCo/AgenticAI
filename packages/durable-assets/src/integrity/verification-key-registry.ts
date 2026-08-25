import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { z } from "zod";
import type { CheckpointVerifier } from "./checkpoint-signing.js";
import { IsoDateTimeSchema, Sha256Schema, SlugSchema } from "../schemas/common.v1.js";
import { SigningAlgorithmSchema } from "../schemas/trust.v1.js";
import { sha256Canonical } from "./canonical-hash.js";

const VerificationKeySchema = z.object({
  keyId: z.string().min(1),
  algorithm: SigningAlgorithmSchema,
  publicKeyFingerprint: Sha256Schema,
  publicKeyDerBase64: z.string().min(1),
  status: z.enum(["TRUSTED", "REVOKED"]),
  trustedAt: IsoDateTimeSchema,
  revokedAt: IsoDateTimeSchema.nullable(),
  revocationReason: z.string().min(1).nullable(),
}).strict();

export const VerificationKeyRegistryV1Schema = z.object({
  schema: z.literal("VerificationKeyRegistry/v1"),
  registryId: SlugSchema,
  revision: z.number().int().positive(),
  createdAt: IsoDateTimeSchema,
  keys: z.array(VerificationKeySchema),
  registryHash: Sha256Schema,
}).strict();

export type VerificationKeyRegistryV1 = z.infer<typeof VerificationKeyRegistryV1Schema>;

export function createVerificationKeyRegistry(input: Omit<VerificationKeyRegistryV1, "schema" | "registryHash">): VerificationKeyRegistryV1 {
  const base = { schema: "VerificationKeyRegistry/v1" as const, ...input };
  const ids = input.keys.map(key => key.keyId);
  if (new Set(ids).size !== ids.length) throw new Error("Verification key IDs must be unique.");
  for (const key of input.keys) {
    const observed = `sha256:${createHash("sha256").update(Buffer.from(key.publicKeyDerBase64, "base64")).digest("hex")}`;
    if (observed !== key.publicKeyFingerprint) throw new Error(`Public key fingerprint mismatch for ${key.keyId}.`);
    if (key.status === "REVOKED" && !key.revokedAt) throw new Error(`Revoked key ${key.keyId} requires revokedAt.`);
  }
  return VerificationKeyRegistryV1Schema.parse({ ...base, registryHash: sha256Canonical(base) });
}

export function createRegistryCheckpointVerifier(registry: VerificationKeyRegistryV1): CheckpointVerifier {
  const parsed = VerificationKeyRegistryV1Schema.parse(registry);
  const { registryHash, ...base } = parsed;
  if (sha256Canonical(base) !== registryHash) throw new Error("Verification key registry hash mismatch.");
  return {
    async verify(input) {
      const key = parsed.keys.find(candidate => candidate.keyId === input.keyId);
      if (!key) return "UNKNOWN_KEY";
      if (key.status === "REVOKED") return "REVOKED_KEY";
      if (key.algorithm !== input.algorithm) return "ALGORITHM_NOT_ALLOWED";
      if (key.publicKeyFingerprint !== input.publicKeyFingerprint) return "FINGERPRINT_MISMATCH";
      const publicKey = createPublicKey({ key: Buffer.from(key.publicKeyDerBase64, "base64"), type: "spki", format: "der" });
      const algorithm = input.algorithm === "Ed25519" ? null : "sha256";
      return verifySignature(algorithm, input.payload, publicKey, input.signature) ? "TRUSTED" : "INVALID_SIGNATURE";
    },
  };
}
