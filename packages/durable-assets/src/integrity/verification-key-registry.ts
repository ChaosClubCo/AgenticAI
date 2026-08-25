import { constants, createHash, createPublicKey, verify as verifySignature, type KeyObject } from "node:crypto";
import { z } from "zod";
import type { CheckpointVerifier } from "./checkpoint-signing.js";
import { IsoDateTimeSchema, Sha256Schema, SlugSchema } from "../schemas/common.v1.js";
import { SigningAlgorithmSchema, type SigningAlgorithm } from "../schemas/trust.v1.js";
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
type VerificationKey = VerificationKeyRegistryV1["keys"][number];

function decodeAndValidateKey(key: VerificationKey): KeyObject {
  const der = Buffer.from(key.publicKeyDerBase64, "base64");
  const observed = `sha256:${createHash("sha256").update(der).digest("hex")}`;
  if (observed !== key.publicKeyFingerprint) throw new Error(`Public key fingerprint mismatch for ${key.keyId}.`);
  if (key.status === "REVOKED" && !key.revokedAt) throw new Error(`Revoked key ${key.keyId} requires revokedAt.`);
  const publicKey = createPublicKey({ key: der, type: "spki", format: "der" });
  assertKeyTypeMatchesAlgorithm(publicKey, key.algorithm, key.keyId);
  return publicKey;
}

function assertKeyTypeMatchesAlgorithm(publicKey: KeyObject, algorithm: SigningAlgorithm, keyId: string): void {
  const type = publicKey.asymmetricKeyType;
  const valid = algorithm === "Ed25519" ? type === "ed25519"
    : algorithm === "ECDSA_P256_SHA256" ? type === "ec"
      : type === "rsa" || type === "rsa-pss";
  if (!valid) throw new Error(`Verification key type ${type ?? "unknown"} is incompatible with ${algorithm} for ${keyId}.`);
}

function validateRegistryInvariants(registry: VerificationKeyRegistryV1): Map<string, KeyObject> {
  const ids = registry.keys.map(key => key.keyId);
  if (new Set(ids).size !== ids.length) throw new Error("Verification key IDs must be unique.");
  const keys = new Map<string, KeyObject>();
  for (const key of registry.keys) keys.set(key.keyId, decodeAndValidateKey(key));
  return keys;
}

export function createVerificationKeyRegistry(input: Omit<VerificationKeyRegistryV1, "schema" | "registryHash">): VerificationKeyRegistryV1 {
  const base = { schema: "VerificationKeyRegistry/v1" as const, ...input };
  const parsedBase = { ...base, registryHash: sha256Canonical(base) };
  const parsed = VerificationKeyRegistryV1Schema.parse(parsedBase);
  validateRegistryInvariants(parsed);
  return parsed;
}

export function createRegistryCheckpointVerifier(registry: VerificationKeyRegistryV1): CheckpointVerifier {
  const parsed = VerificationKeyRegistryV1Schema.parse(registry);
  const { registryHash, ...base } = parsed;
  if (sha256Canonical(base) !== registryHash) throw new Error("Verification key registry hash mismatch.");
  const publicKeys = validateRegistryInvariants(parsed);
  return {
    async verify(input) {
      const key = parsed.keys.find(candidate => candidate.keyId === input.keyId);
      if (!key) return "UNKNOWN_KEY";
      if (key.status === "REVOKED") return "REVOKED_KEY";
      if (key.algorithm !== input.algorithm) return "ALGORITHM_NOT_ALLOWED";
      if (key.publicKeyFingerprint !== input.publicKeyFingerprint) return "FINGERPRINT_MISMATCH";
      const publicKey = publicKeys.get(key.keyId);
      if (!publicKey) return "UNKNOWN_KEY";
      if (input.algorithm === "Ed25519") {
        return verifySignature(null, input.payload, publicKey, input.signature) ? "TRUSTED" : "INVALID_SIGNATURE";
      }
      if (input.algorithm === "RSA_PSS_SHA256") {
        return verifySignature("sha256", input.payload, {
          key: publicKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
        }, input.signature) ? "TRUSTED" : "INVALID_SIGNATURE";
      }
      return verifySignature("sha256", input.payload, publicKey, input.signature) ? "TRUSTED" : "INVALID_SIGNATURE";
    },
  };
}
