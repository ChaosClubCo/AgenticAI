import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createVerificationKeyRegistry, createRegistryCheckpointVerifier } from "./integrity/verification-key-registry.js";
import { createLocalEd25519Signer, signRegistryCheckpoint, verifySignedRegistryCheckpoint } from "./integrity/checkpoint-signing.js";
import { signRegistryProjectionSnapshot, verifySignedRegistryProjectionSnapshot } from "./integrity/snapshot-signing.js";
import { GitCliObjectReader, verifyMaterializationReceipt } from "./integrity/git-materialization-verifier.js";
import { FileAttestationStore } from "./persistence/file-attestation-store.js";
import { createMaterializationReceipt } from "./persistence/materialization-receipt-store.js";
import { PRODUCTION_AUTHORITY_POLICY } from "./authority/production-authority-policy.js";
import { sha256Canonical } from "./integrity/canonical-hash.js";
import { createDurableAssetsToolHandlers } from "./mcp/promotion-tools.js";
import { PromotionEventV1Schema, type PromotionEventV1 } from "./schemas/promotion-event.v1.js";
import { projectRegistry } from "./projection/registry-projection.js";
import { createRegistryCheckpoint } from "./projection/registry-checkpoint.js";
import { createProjectionSnapshot, projectRegistryFromVerifiedSnapshot } from "./projection/verified-replay.js";
import { materializeAsset } from "./materializers/repo-materializer.js";
import { createAgentAdapters, runCrossAgentConformance } from "./adapters/agent-adapters.js";

const now = "2026-08-25T18:00:00.000Z";
const stamp = (seconds: number) => new Date(Date.parse(now) + seconds * 1000).toISOString();

test("verification key registry distinguishes trusted and revoked keys", async () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const fingerprint = `sha256:${Buffer.from(await crypto.subtle.digest("SHA-256", publicKeyDer)).toString("hex")}` as const;
  const trusted = createVerificationKeyRegistry({ registryId: "production-keys", revision: 1, createdAt: now, keys: [{ keyId: "signer-prod-1", algorithm: "Ed25519", publicKeyFingerprint: fingerprint, publicKeyDerBase64: Buffer.from(publicKeyDer).toString("base64"), status: "TRUSTED", trustedAt: now, revokedAt: null, revocationReason: null }] });
  const revoked = createVerificationKeyRegistry({ registryId: "production-keys", revision: 2, createdAt: now, keys: [{ ...trusted.keys[0]!, status: "REVOKED", revokedAt: now, revocationReason: "rotation" }] });
  const trustedVerifier = createRegistryCheckpointVerifier(trusted);
  const revokedVerifier = createRegistryCheckpointVerifier(revoked);
  assert.notEqual(await trustedVerifier.verify({ algorithm: "Ed25519", keyId: "signer-prod-1", publicKeyFingerprint: fingerprint, payload: new Uint8Array([1]), signature: new Uint8Array([1]) }), "REVOKED_KEY");
  assert.equal(await revokedVerifier.verify({ algorithm: "Ed25519", keyId: "signer-prod-1", publicKeyFingerprint: fingerprint, payload: new Uint8Array([1]), signature: new Uint8Array([1]) }), "REVOKED_KEY");
});

test("attestation store validates payload hashes and persists artifacts immutably", async () => {
  const dir = await mkdtemp(join(tmpdir(), "durable-attest-"));
  try {
    const store = new FileAttestationStore(dir);
    const payload = { ok: true };
    const record = { schema: "AttestationArtifact/v1" as const, artifactId: randomUUID(), kind: "SIGNED_CHECKPOINT" as const, payloadHash: sha256Canonical(payload), payload, persistedAt: now };
    await store.append(record);
    await assert.rejects(() => store.append(record), /already exists/i);
    await assert.rejects(() => store.append({ ...record, artifactId: randomUUID(), payloadHash: `sha256:${"0".repeat(64)}` }), /hash mismatch/i);
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

test("end-to-end attestation reaches ACTIVE, verifies Git bytes, signs checkpoint and snapshot, replays, and resolves identically across agents", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "durable-e2e-git-"));
  const attestationDir = await mkdtemp(join(tmpdir(), "durable-e2e-attest-"));
  try {
    const events: PromotionEventV1[] = [];
    const handlers = createDurableAssetsToolHandlers({ actorId: "durable-assets-operator-prod", authorityKind: "OPERATOR", authorityPolicy: PRODUCTION_AUTHORITY_POLICY, appendEvent: async event => { events.push(event); }, listEvents: async () => events, now: () => stamp(0), uuid: randomUUID });
    await handlers.authorizePromotion({ assetId: "production-attestation-skill", patternId: "production-attestation-skill", assetType: "SKILL", version: "1.0.0", canonicalPath: ".skills/production-attestation-skill/SKILL.md", description: "Production attestation fixture.", semanticFingerprint: "semantic:v1:production-attestation-skill", authorityRef: "production-acceptance", evidenceRefs: [] });
    events.push(PromotionEventV1Schema.parse({ schema: "PromotionEvent/v1", eventId: randomUUID(), occurredAt: stamp(1), actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId: "production-attestation-skill", to: "TESTED" }));
    const requiredTests = ["POSITIVE_TRIGGER", "NEGATIVE_TRIGGER", "AMBIGUOUS_TRIGGER", "OUTPUT_CONTRACT", "FAILURE_PATH"] as const;
    requiredTests.forEach((testType, index) => events.push(PromotionEventV1Schema.parse({ schema: "PromotionEvent/v1", eventId: randomUUID(), occurredAt: stamp(index + 2), actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId: "production-attestation-skill", testId: `acceptance-${index}`, testType, status: "PASSED" })));
    events.push(PromotionEventV1Schema.parse({ schema: "PromotionEvent/v1", eventId: randomUUID(), occurredAt: stamp(7), actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId: "production-attestation-skill", to: "VERIFIED" }));
    events.push(PromotionEventV1Schema.parse({ schema: "PromotionEvent/v1", eventId: randomUUID(), occurredAt: stamp(8), actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId: "production-attestation-skill", to: "ACTIVE" }));

    const projection = projectRegistry(events);
    const asset = projection.registry.assets["production-attestation-skill"]!;
    assert.equal(asset.lifecycle, "ACTIVE");

    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Durable Assets CI"], { cwd: repoRoot });
    execFileSync("git", ["config", "user.email", "durable-assets@example.invalid"], { cwd: repoRoot });
    const materialized = await materializeAsset(repoRoot, asset, "# Production Attestation Skill\n\nVerified lifecycle fixture.");
    execFileSync("git", ["add", "."], { cwd: repoRoot });
    execFileSync("git", ["commit", "-m", "attest durable asset"], { cwd: repoRoot, stdio: "ignore" });
    const commitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
    const receipt = createMaterializationReceipt({ receiptId: randomUUID(), assetId: asset.assetId, assetVersion: asset.version, relativePath: materialized.relativePath, assetHash: materialized.assetHash, registryProjectionHash: projection.projectionHash, repositoryCommitSha: commitSha, materializedAt: stamp(9) });
    const materializationVerification = await verifyMaterializationReceipt(receipt, new GitCliObjectReader(repoRoot), randomUUID(), stamp(10));
    assert.equal(materializationVerification.verdict, "VERIFIED");

    const checkpoint = createRegistryCheckpoint(projection, { checkpointId: randomUUID(), createdAt: stamp(11), previousCheckpointHash: null });
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const signer = createLocalEd25519Signer("production-attestation-key", privateKey, publicKey);
    const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
    const keyRegistry = createVerificationKeyRegistry({ registryId: "production-keys", revision: 1, createdAt: stamp(11), keys: [{ keyId: signer.keyId, algorithm: signer.algorithm, publicKeyFingerprint: signer.publicKeyFingerprint, publicKeyDerBase64: Buffer.from(publicKeyDer).toString("base64"), status: "TRUSTED", trustedAt: stamp(11), revokedAt: null, revocationReason: null }] });
    const verifier = createRegistryCheckpointVerifier(keyRegistry);
    const signedCheckpoint = await signRegistryCheckpoint(checkpoint, signer, stamp(12));
    assert.equal(await verifySignedRegistryCheckpoint(signedCheckpoint, verifier), "TRUSTED");

    const snapshot = createProjectionSnapshot(projection, checkpoint, randomUUID(), stamp(13));
    const signedSnapshot = await signRegistryProjectionSnapshot(snapshot, signer, stamp(14));
    assert.equal(await verifySignedRegistryProjectionSnapshot(signedSnapshot, verifier), "TRUSTED");
    const replayed = projectRegistryFromVerifiedSnapshot(snapshot, checkpoint, []);
    assert.equal(replayed.projectionHash, projection.projectionHash);

    const conformance = runCrossAgentConformance(createAgentAdapters(), replayed.registry, replayed.projectionHash);
    assert.equal(conformance.passed, true);
    assert.equal(new Set(conformance.assetSetHashes).size, 1);

    const store = new FileAttestationStore(attestationDir);
    await store.append({ schema: "AttestationArtifact/v1", artifactId: randomUUID(), kind: "SIGNED_CHECKPOINT", payloadHash: sha256Canonical(signedCheckpoint), payload: signedCheckpoint, persistedAt: stamp(15) });
    await store.append({ schema: "AttestationArtifact/v1", artifactId: randomUUID(), kind: "SIGNED_SNAPSHOT", payloadHash: sha256Canonical(signedSnapshot), payload: signedSnapshot, persistedAt: stamp(16) });
    await store.append({ schema: "AttestationArtifact/v1", artifactId: randomUUID(), kind: "MATERIALIZATION_VERIFICATION", payloadHash: sha256Canonical(materializationVerification), payload: materializationVerification, persistedAt: stamp(17) });
    await store.append({ schema: "AttestationArtifact/v1", artifactId: randomUUID(), kind: "ATTESTATION_RECEIPT", payloadHash: sha256Canonical(conformance), payload: conformance, persistedAt: stamp(18) });
    assert.equal((await store.list()).length, 4);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
    await rm(attestationDir, { recursive: true, force: true });
  }
});
