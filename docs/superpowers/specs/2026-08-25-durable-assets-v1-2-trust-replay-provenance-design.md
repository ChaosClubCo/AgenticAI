# Durable Assets v1.2 Trust, Replay, Provenance, and Cross-Agent Conformance Design

## Status

Approved architectural direction for implementation planning. This design extends the merged Durable Assets v1.1 control plane at commit `833006c57041c6d3797993a3c5f3835a9e0da00a`.

## Goal

Extend durable-assets so registry integrity is externally attestable, replay can begin from a verified checkpointed projection, materialization receipts can be proven against exact committed Git bytes, promotion authority is identity- and asset-type-scoped, provenance is available through read-only MCP tools, and Claude/Codex/Gemini adapters provably consume the same lifecycle-safe active registry.

## Non-Goals

- Do not move KMS/provider SDKs into the deterministic core package.
- Do not make Git signatures the primary registry trust root.
- Do not let model/tool input choose its own promotion authority.
- Do not permit agent adapters to reinterpret lifecycle semantics.
- Do not make snapshots canonical history; immutable events remain canonical.
- Do not silently fall back from failed signed snapshot verification to event-zero replay unless an explicit caller policy allows it.

## Architectural Principles

1. **Events remain canonical history.** Snapshots accelerate replay but never replace the immutable event stream.
2. **Signatures attest accepted projections.** Hashes prove integrity; asymmetric signatures establish external attestation.
3. **Verification is separable from signing.** Read-only processes can verify using public keys without access to signing credentials.
4. **Authority is deny-by-default.** Identity, authority kind, and asset type must all be allowed by a versioned policy.
5. **Git evidence verifies exact bytes.** Receipt verification compares the SHA-256 hash of the exact blob at `repositoryCommitSha:relativePath` with the recorded asset hash.
6. **Agent adapters are pure consumers.** They may transform packaging but cannot mutate registry state or activate non-active assets.
7. **Mutation and provenance MCP capabilities are separate.** Read-only provenance hosts do not require mutation, authority, or signing credentials.

---

## 1. Signed Registry Checkpoints

### 1.1 Contracts

Add `SignedRegistryCheckpoint/v1` as an envelope around `RegistryCheckpoint/v1`.

Required fields:

- `schema: "SignedRegistryCheckpoint/v1"`
- `checkpoint: RegistryCheckpointV1`
- `signingAlgorithm: "Ed25519" | "ECDSA_P256_SHA256" | "RSA_PSS_SHA256"`
- `keyId: string`
- `publicKeyFingerprint: sha256:*`
- `signedPayloadHash: sha256:*`
- `signature: base64`
- `signedAt: ISO-8601 timestamp`

The signed payload is the canonical serialization of the complete validated `RegistryCheckpoint/v1` object. `signedPayloadHash` MUST equal SHA-256 over those exact canonical bytes before signature verification is attempted.

### 1.2 Signer/Verifier Interfaces

```ts
export interface CheckpointSigner {
  readonly algorithm: SigningAlgorithm;
  readonly keyId: string;
  readonly publicKeyFingerprint: `sha256:${string}`;
  sign(payload: Uint8Array): Promise<Uint8Array>;
}

export interface CheckpointVerifier {
  verify(input: {
    algorithm: SigningAlgorithm;
    keyId: string;
    publicKeyFingerprint: `sha256:${string}`;
    payload: Uint8Array;
    signature: Uint8Array;
  }): Promise<CheckpointSignatureVerdict>;
}
```

`CheckpointSignatureVerdict` values:

- `TRUSTED`
- `INVALID_SIGNATURE`
- `UNKNOWN_KEY`
- `REVOKED_KEY`
- `ALGORITHM_NOT_ALLOWED`
- `FINGERPRINT_MISMATCH`

### 1.3 Provider Boundary

Core package ships a local Ed25519 signer/verifier for tests and development. Production signing is injected through `CheckpointSigner`; KMS/HSM adapters live outside deterministic checkpoint creation and verification logic.

The private key MUST NOT be persisted in registry state, checkpoint records, event records, or MCP tool payloads.

### 1.4 Chain Verification

A checkpoint chain is trusted only when every checkpoint satisfies all of:

1. `checkpointHash` is internally valid.
2. `previousCheckpointHash` matches the prior checkpoint.
3. signature validates against a currently trusted verification key.
4. signing algorithm is policy-allowed.
5. key is not revoked as of verification time.

---

## 2. Projection Snapshots and Replay Cursors

### 2.1 Snapshot Contract

Add `RegistryProjectionSnapshot/v1`:

- `schema`
- `snapshotId: UUID`
- `checkpointId: UUID`
- `registry: DurableAssetRegistryV1`
- `projectionHash: sha256:*`
- `registryRevision: number`
- `eventCount: number`
- `cursor.occurredAt: ISO timestamp | null`
- `cursor.eventId: UUID | null`
- `snapshotHash: sha256:*`
- `createdAt: ISO timestamp`

`snapshotHash` is SHA-256 over the canonical snapshot payload excluding the `snapshotHash` field itself.

### 2.2 Snapshot Persistence

Add immutable snapshot persistence with exclusive-create semantics keyed by `snapshotId`.

A snapshot is usable for accelerated replay only if:

- the referenced signed checkpoint is trusted;
- `checkpoint.projectionHash === snapshot.projectionHash`;
- `checkpoint.registryRevision === snapshot.registryRevision`;
- `checkpoint.eventCount === snapshot.eventCount`;
- `checkpoint.lastEventId === snapshot.cursor.eventId`;
- `snapshotHash` verifies;
- `sha256Canonical(snapshot.registry) === snapshot.projectionHash`.

### 2.3 Replay API

Add:

```ts
projectRegistryFromVerifiedSnapshot(
  snapshot: RegistryProjectionSnapshotV1,
  trailingEvents: readonly PromotionEventV1[],
): ProjectionResult
```

Trailing events MUST sort strictly after the snapshot cursor using the existing `(occurredAt, eventId)` ordering. Events at or before the cursor MUST be rejected rather than replayed again.

Add an orchestration helper:

```ts
reconstructRegistry(options: {
  events: readonly PromotionEventV1[];
  signedCheckpoints: readonly SignedRegistryCheckpointV1[];
  snapshots: readonly RegistryProjectionSnapshotV1[];
  verifier: CheckpointVerifier;
  fallbackPolicy: "FAIL_CLOSED" | "REPLAY_FROM_ZERO";
}): Promise<ProjectionResult>
```

Default is `FAIL_CLOSED` when a candidate snapshot/checkpoint exists but fails verification. `REPLAY_FROM_ZERO` must be explicitly selected by the caller.

---

## 3. Git-Verified Materialization Receipts

### 3.1 Verification Contract

Add `MaterializationVerification/v1`:

- `schema`
- `verificationId: UUID`
- `receiptId: UUID`
- `repositoryCommitSha`
- `relativePath`
- `expectedAssetHash`
- `observedAssetHash: sha256:* | null`
- `gitObjectId: string | null`
- `verifiedAt`
- `verdict`

Verdicts:

- `VERIFIED`
- `COMMIT_NOT_FOUND`
- `PATH_NOT_FOUND`
- `HASH_MISMATCH`
- `INVALID_PATH`
- `GIT_ERROR`

### 3.2 Git Reader Interface

```ts
export interface GitObjectReader {
  readBlob(input: {
    commitSha: string;
    relativePath: string;
  }): Promise<{
    bytes: Uint8Array;
    objectId?: string;
  }>;
}
```

Provide `GitCliObjectReader` using direct process argument execution, never shell interpolation. The adapter must validate `relativePath` before invoking Git and must reject absolute paths, NUL bytes, and path traversal.

### 3.3 Verification Semantics

`verifyMaterializationReceipt(receipt, reader)`:

1. validates receipt schema;
2. reads exact bytes from the recorded commit/path;
3. hashes those exact bytes with SHA-256;
4. compares with `receipt.assetHash`;
5. returns and optionally persists `MaterializationVerification/v1`.

No newline normalization, Markdown parsing, encoding conversion, or trimming is permitted before hashing.

---

## 4. Authority Policy Configuration

### 4.1 Contract

Add `AuthorityPolicy/v1` with:

- `schema`
- `policyId`
- `revision`
- `createdAt`
- `principals[]`
- `policyHash`

Each principal contains:

- `principalId`
- `identities[]`
- `authorities`

Each authority entry contains:

- `kind: SECURITY | COMPLIANCE | OPERATOR`
- `assetTypes[]`

No wildcard identity or wildcard asset type is supported in v1.2.

### 4.2 Evaluation

```ts
export interface AuthorityDecision {
  verdict: "ALLOW" | "DENY";
  principalId: string | null;
  authorityKind: PromotionAuthorityKind;
  assetType: DurableAssetType;
  policyRevision: number;
  policyHash: `sha256:${string}`;
  reasonCode: string;
}
```

`authorizePromotion` must evaluate identity + requested authority + asset type against the policy before creating any privileged promotion event.

All privileged promotion events MUST record:

- `authorityPolicyRevision`
- `authorityPolicyHash`
- resolved `principalId`

Historical events remain bound to the policy that authorized them.

### 4.3 Server Configuration

MCP host configuration supplies:

- immutable `actorId` / identity;
- requested authority kind available to the host;
- loaded `AuthorityPolicy/v1`.

Tool input MUST NOT contain actor identity, authority kind, principal ID, policy revision, or policy hash.

---

## 5. Read-Only Provenance MCP Tools

### 5.1 Capability Split

Refactor MCP registration into three independent functions:

- `registerProvenanceTools`
- `registerMutationTools`
- `registerAuthorityTools`

A read-only provenance server can register only the first group.

### 5.2 Read-Only Tools

Expose:

- `durable_assets_get_asset_lineage`
- `durable_assets_verify_checkpoint`
- `durable_assets_verify_checkpoint_chain`
- `durable_assets_verify_materialization_receipt`
- `durable_assets_get_active_registry`
- `durable_assets_get_projection_status`
- `durable_assets_get_authority_policy`

These tools MUST have no write dependencies and MUST operate with verification keys only.

### 5.3 Asset Lineage

`get_asset_lineage(assetId)` returns:

- current asset metadata;
- `supersedes[]` chain;
- `supersededBy` chain;
- `mergedPatternIds[]`;
- promotion authority metadata;
- evidence references;
- lifecycle state;
- materialization receipt/verifications associated with the asset where available.

Lineage traversal must detect and reject cycles in corrupt registry data.

### 5.4 Mutation/Authority Registration

Mutation tools are registered only when an append-event capability exists.

Authority promotion is registered only when:

- a principal identity is configured;
- authority kind is configured;
- authority policy is loaded;
- policy grants at least one durable asset type for that identity and kind.

Final asset-type authorization occurs again inside the handler for every call.

---

## 6. Cross-Agent Adapter Conformance

### 6.1 Canonical Consumer Interface

```ts
export interface DurableAssetConsumerAdapter {
  readonly adapterId: "claude" | "codex" | "gemini";

  resolveActiveAssets(
    registry: DurableAssetRegistryV1,
  ): readonly ResolvedAgentAsset[];

  renderRegistryReference(
    registry: DurableAssetRegistryV1,
    projectionHash: `sha256:${string}`,
  ): string;
}
```

`ResolvedAgentAsset` includes only canonical active assets and their immutable metadata needed by the consumer.

### 6.2 Adapter Rules

All adapters MUST:

- include `ACTIVE` assets only;
- exclude `CANDIDATE`, `PROMOTED`, `TESTED`, `VERIFIED`, and `DEPRECATED` assets;
- observe the same canonical `projectionHash`;
- preserve canonical asset ID and version;
- never emit lifecycle mutation events;
- never treat local/generated files as authoritative when their registry projection or generated-file integrity check fails;
- reject an untrusted signed checkpoint when signature-required mode is enabled.

### 6.3 Adapter Outputs

- **Claude adapter:** deterministic reference/index suitable for Claude Skill discovery without changing lifecycle semantics.
- **Codex adapter:** deterministic registry/bootstrap reference suitable for Codex repository instructions.
- **Gemini adapter:** deterministic registry/bootstrap reference suitable for Gemini agent context.

The adapters may differ in packaging syntax only. Their resolved asset set MUST be byte-for-byte equivalent after canonical normalization.

### 6.4 Conformance Manifest

Add `CrossAgentConformanceManifest/v1` with fixture cases and per-adapter verdicts.

Required fixtures:

1. active Skill resolves;
2. verified-but-inactive Skill excluded;
3. promoted Skill excluded;
4. deprecated Skill excluded;
5. superseded predecessor excluded after replacement activation;
6. equal projection hash observed;
7. adapter cannot mutate lifecycle;
8. hand-edited generated registry rejected;
9. invalid checkpoint rejected;
10. unsigned/untrusted snapshot rejected when signature-required mode is enabled.

A release passes only when Claude, Codex, and Gemini adapters pass every fixture.

---

## 7. Data Flow

```text
PromotionEvent/v1
       |
       v
Immutable Event Store
       |
       +------------------------------+
       |                              |
       v                              |
Verified Signed Checkpoint            |
       |                              |
       v                              |
Verified Projection Snapshot          |
       |                              |
       v                              |
Trailing Event Replay <---------------+
       |
       v
Canonical DurableAssetRegistry/v1
       |
       +--> canonical projection hash
       |
       +--> signed checkpoint
       |
       +--> Git materialization -> commit:path byte verification
       |
       +--> read-only provenance MCP
       |
       +--> Claude adapter
       +--> Codex adapter
       +--> Gemini adapter
```

---

## 8. Error Handling and Failure Policy

### Signed checkpoints

- Invalid signature: reject checkpoint.
- Unknown key: reject unless caller's explicit trust policy resolves it.
- Revoked key: reject checkpoint even if cryptographically valid.
- Broken checkpoint chain: reject the affected chain suffix.

### Snapshot replay

- Snapshot/checkpoint mismatch: fail closed by default.
- Trailing event precedes/equal cursor: reject replay request.
- Snapshot hash mismatch: reject snapshot.

### Git verification

- Commit missing: `COMMIT_NOT_FOUND`.
- Path missing: `PATH_NOT_FOUND`.
- Blob differs: `HASH_MISMATCH`.
- Git process failure not otherwise classified: `GIT_ERROR`.

### Authority

- Unknown identity: DENY.
- Wrong authority kind: DENY.
- Disallowed asset type: DENY.
- Invalid policy hash: reject policy load.

### MCP

Read-only provenance tools must return typed failure data rather than writing repair events. Mutation and authority tools must remain absent from hosts that lack their required capabilities.

---

## 9. Security Model

### Trust domains

1. **Event integrity:** append-only event store.
2. **Projection integrity:** deterministic SHA-256.
3. **Projection attestation:** asymmetric signed checkpoints.
4. **Key trust:** trusted/revoked public-key policy.
5. **Promotion authorization:** `AuthorityPolicy/v1`.
6. **Materialization evidence:** exact committed Git bytes.
7. **Agent consumption:** read-only lifecycle-safe adapters.

A valid cryptographic signature does not imply promotion authority. A valid authority decision does not imply a valid registry signature. These controls remain independent.

### Key handling

- private signing keys never appear in MCP tool input/output;
- verification hosts receive public verification material only;
- KMS/HSM adapters implement `CheckpointSigner` without exporting private key bytes;
- signature algorithm allowlist is explicit;
- key revocation is checked at verification time.

---

## 10. Test Strategy

Implementation is TDD-first. The acceptance suite MUST be committed and observed failing before production code is added.

Required test groups:

### Signing

- valid Ed25519 signed checkpoint verifies;
- payload tamper invalidates signature;
- wrong key fails;
- revoked key fails;
- disallowed algorithm fails;
- chain with valid hashes but invalid signature fails.

### Replay

- snapshot + trailing events equals event-zero projection exactly;
- invalid snapshot hash fails;
- mismatched checkpoint/snapshot fails;
- event at/before cursor rejected;
- explicit replay-from-zero fallback works only when configured.

### Git verification

- committed bytes match receipt -> VERIFIED;
- changed blob -> HASH_MISMATCH;
- missing commit and path classified separately;
- traversal/absolute path rejected before Git invocation.

### Authority

- allowed identity/kind/type creates event;
- unknown identity denied;
- allowed identity but wrong asset type denied;
- tool-supplied authority metadata impossible by schema;
- privileged event carries policy revision/hash/principal.

### MCP provenance

- read-only host exposes provenance tools and no mutation tools;
- mutation host without authority policy exposes mutation but no authority promotion;
- authority tool registration requires policy grant;
- `get_asset_lineage` detects cycles;
- receipt verification tool performs no writes.

### Cross-agent conformance

All ten `CrossAgentConformanceManifest/v1` fixtures pass for Claude, Codex, and Gemini adapters and yield an identical normalized active asset set.

### Regression

All v1 and v1.1 replay/idempotency/lifecycle/materialization/checkpoint tests remain green.

---

## 11. Proposed File Boundaries

```text
packages/durable-assets/src/
├── signing/
│   ├── checkpoint-signer.ts
│   ├── local-ed25519-signer.ts
│   └── trust-store.ts
├── projection/
│   ├── registry-snapshot.ts
│   ├── replay-from-snapshot.ts
│   └── registry-checkpoint.ts
├── persistence/
│   ├── file-projection-snapshot-store.ts
│   └── file-signed-checkpoint-store.ts
├── git-verification/
│   ├── git-object-reader.ts
│   ├── git-cli-object-reader.ts
│   └── verify-materialization.ts
├── authority/
│   ├── authority-policy.ts
│   └── authority-evaluator.ts
├── mcp/
│   ├── provenance-tools.ts
│   ├── mutation-tools.ts
│   ├── authority-tools.ts
│   └── server.ts
├── adapters/
│   ├── consumer-adapter.ts
│   ├── claude-adapter.ts
│   ├── codex-adapter.ts
│   ├── gemini-adapter.ts
│   └── conformance.ts
└── schemas/
    ├── signed-checkpoint.v1.ts
    ├── projection-snapshot.v1.ts
    ├── materialization-verification.v1.ts
    ├── authority-policy.v1.ts
    └── cross-agent-conformance.v1.ts
```

Existing files should be modified only where their public interfaces must be extended. No unrelated refactors are part of v1.2.

---

## 12. Release Gate

v1.2 may merge only when all of the following are true for the exact PR head:

1. strict TypeScript passes;
2. all v1/v1.1 regression tests pass;
3. all v1.2 acceptance tests pass;
4. signed checkpoint tamper tests pass;
5. replay-from-snapshot equivalence test passes;
6. Git exact-byte verification tests pass;
7. authority deny-by-default matrix passes;
8. read-only MCP capability isolation passes;
9. Claude/Codex/Gemini conformance manifest is 100% PASS;
10. no unresolved security/review findings remain;
11. merge uses expected-head SHA protection.

## 13. Decision Summary

Use a provider-neutral deterministic core with pluggable asymmetric/KMS signing, immutable signed checkpoints plus projection snapshots, exact Git blob verification for materialization evidence, deny-by-default identity/asset-type authority policy, capability-separated MCP registration, and pure Claude/Codex/Gemini consumer adapters governed by one conformance manifest.
