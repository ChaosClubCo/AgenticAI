import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AwsKmsEcdsaP256Signer } from "./integrity/aws-kms-signer.js";
import { createVerificationKeyRegistry, createRegistryCheckpointVerifier } from "./integrity/verification-key-registry.js";
import { FileAttestationStore } from "./persistence/file-attestation-store.js";
import { PRODUCTION_AUTHORITY_POLICY } from "./authority/production-authority-policy.js";
import { sha256Text } from "./integrity/canonical-hash.js";

const now = "2026-08-25T18:00:00.000Z";

test("AWS KMS signer signs RAW payloads with ECDSA_SHA_256 and never exports a private key", async () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const calls: unknown[] = [];
  const kms = {
    send: async (command: { input?: unknown }) => {
      calls.push(command.input);
      return { Signature: new Uint8Array([1, 2, 3]) };
    },
  };
  const signer = new AwsKmsEcdsaP256Signer({ client: kms, keyId: "arn:aws:kms:us-east-1:123456789012:key/test", publicKeyDer });
  const signature = await signer.sign(new TextEncoder().encode("payload"));
  assert.deepEqual([...signature], [1, 2, 3]);
  assert.equal(signer.algorithm, "ECDSA_P256_SHA256");
  assert.match(signer.publicKeyFingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(calls, [{ KeyId: "arn:aws:kms:us-east-1:123456789012:key/test", Message: new TextEncoder().encode("payload"), MessageType: "RAW", SigningAlgorithm: "ECDSA_SHA_256" }]);
  assert.equal("privateKey" in signer, false);
});

test("verification key registry distinguishes trusted and revoked keys", async () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = `sha256:${Buffer.from(await crypto.subtle.digest("SHA-256", publicKeyDer)).toString("hex")}` as const;
  const trusted = createVerificationKeyRegistry({ registryId: "production-keys", revision: 1, createdAt: now, keys: [{ keyId: "kms-prod-1", algorithm: "ECDSA_P256_SHA256", publicKeyFingerprint: fingerprint, publicKeyDerBase64: Buffer.from(publicKeyDer).toString("base64"), status: "TRUSTED", trustedAt: now, revokedAt: null, revocationReason: null }] });
  const revoked = createVerificationKeyRegistry({ registryId: "production-keys", revision: 2, createdAt: now, keys: [{ ...trusted.keys[0]!, status: "REVOKED", revokedAt: now, revocationReason: "rotation" }] });
  const trustedVerifier = createRegistryCheckpointVerifier(trusted);
  const revokedVerifier = createRegistryCheckpointVerifier(revoked);
  assert.notEqual(await trustedVerifier.verify({ algorithm: "ECDSA_P256_SHA256", keyId: "kms-prod-1", publicKeyFingerprint: fingerprint, payload: new Uint8Array([1]), signature: new Uint8Array([1]) }), "REVOKED_KEY");
  assert.equal(await revokedVerifier.verify({ algorithm: "ECDSA_P256_SHA256", keyId: "kms-prod-1", publicKeyFingerprint: fingerprint, payload: new Uint8Array([1]), signature: new Uint8Array([1]) }), "REVOKED_KEY");
});

test("attestation store persists signed checkpoints and snapshots immutably", async () => {
  const dir = await mkdtemp(join(tmpdir(), "durable-attest-"));
  try {
    const store = new FileAttestationStore(dir);
    const record = { schema: "AttestationArtifact/v1" as const, artifactId: randomUUID(), kind: "SIGNED_CHECKPOINT" as const, payloadHash: sha256Text("payload"), payload: { ok: true }, persistedAt: now };
    await store.append(record);
    await assert.rejects(() => store.append(record), /already exists/i);
    assert.equal((await store.list()).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("production authority policy has isolated SECURITY COMPLIANCE and OPERATOR service identities", () => {
  const identities = PRODUCTION_AUTHORITY_POLICY.principals.flatMap(p => p.identities);
  assert.equal(new Set(identities).size, identities.length);
  assert.ok(PRODUCTION_AUTHORITY_POLICY.principals.some(p => p.authorities.some(a => a.kind === "SECURITY")));
  assert.ok(PRODUCTION_AUTHORITY_POLICY.principals.some(p => p.authorities.some(a => a.kind === "COMPLIANCE")));
  assert.ok(PRODUCTION_AUTHORITY_POLICY.principals.some(p => p.authorities.some(a => a.kind === "OPERATOR")));
});
