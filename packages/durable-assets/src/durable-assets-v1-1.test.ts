import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { PromotionEventV1Schema, type PromotionEventV1 } from "./schemas/promotion-event.v1.js";
import { createEmptyRegistry, reducePromotionEvent } from "./reducer/promotion-reducer.js";
import { projectRegistry } from "./projection/registry-projection.js";
import {
  createRegistryCheckpoint,
  verifyRegistryCheckpoint,
} from "./projection/registry-checkpoint.js";
import {
  materializeSkillRegistryProjection,
  verifySkillRegistryProjection,
} from "./materializers/skill-registry-materializer.js";
import {
  createMaterializationReceipt,
  FileMaterializationReceiptStore,
} from "./persistence/materialization-receipt-store.js";
import { createDurableAssetsToolHandlers } from "./mcp/promotion-tools.js";

const HASH_A = `sha256:${"a".repeat(64)}`;
const HASH_B = `sha256:${"b".repeat(64)}`;
const COMMIT_SHA = "c".repeat(40);
const NOW = "2026-08-25T16:00:00.000Z";

function authorityEvent(
  type: "SECURITY_PROMOTION_AUTHORIZED" | "COMPLIANCE_PROMOTION_AUTHORIZED" | "OPERATOR_PROMOTION_AUTHORIZED",
  suffix: number,
): PromotionEventV1 {
  return PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: `10000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    occurredAt: NOW,
    actorId: "trusted-operator",
    type,
    authorityRef: `approval-${suffix}`,
    assetId: `authority-asset-${suffix}`,
    patternId: `authority-pattern-${suffix}`,
    assetType: "POLICY",
    version: "1.0.0",
    canonicalPath: `policies/authority-asset-${suffix}.md`,
    description: "Authority-promoted durable policy.",
    semanticFingerprint: `semantic:v1:authority-${suffix}`,
    evidenceRefs: [{
      sessionId: "single-session",
      occurrenceId: `authority-occurrence-${suffix}`,
      observedAt: NOW,
      contentHash: HASH_A,
    }],
  });
}

for (const [index, type] of [
  "SECURITY_PROMOTION_AUTHORIZED",
  "COMPLIANCE_PROMOTION_AUTHORIZED",
  "OPERATOR_PROMOTION_AUTHORIZED",
].entries()) {
  test(`${type} bypasses the three-session threshold explicitly`, () => {
    const state = createEmptyRegistry(NOW);
    const result = reducePromotionEvent(state, authorityEvent(type as Parameters<typeof authorityEvent>[0], index + 1));
    const asset = result.state.assets[`authority-asset-${index + 1}`];

    assert.equal(asset?.lifecycle, "PROMOTED");
    assert.equal(asset?.evidenceRefs.length, 1);
    assert.equal(asset?.promotionAuthority?.kind, type.replace("_PROMOTION_AUTHORIZED", ""));
  });
}

test("ASSET_MERGED executes candidate merge into an existing asset", () => {
  let state = reducePromotionEvent(createEmptyRegistry(NOW), authorityEvent("OPERATOR_PROMOTION_AUTHORIZED", 10)).state;
  const observed = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: "20000000-0000-4000-8000-000000000001",
    occurredAt: NOW,
    actorId: "observer",
    type: "PATTERN_OBSERVED",
    patternId: "equivalent-pattern",
    semanticFingerprint: "semantic:v1:equivalent-pattern",
    evidence: {
      sessionId: "merge-session",
      occurrenceId: "merge-occurrence",
      observedAt: NOW,
      contentHash: HASH_B,
    },
    reusable: true,
    temporaryContext: false,
    proposedAssetType: "POLICY",
  });
  state = reducePromotionEvent(state, observed).state;

  const merged = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: "20000000-0000-4000-8000-000000000002",
    occurredAt: NOW,
    actorId: "trusted-operator",
    type: "ASSET_MERGED",
    patternId: "equivalent-pattern",
    targetAssetId: "authority-asset-10",
  });
  state = reducePromotionEvent(state, merged).state;

  assert.equal(state.candidates["equivalent-pattern"]?.mergedIntoAssetId, "authority-asset-10");
  assert.ok(state.assets["authority-asset-10"]?.mergedPatternIds.includes("equivalent-pattern"));
  assert.ok(state.assets["authority-asset-10"]?.evidenceRefs.some((item) => item.occurrenceId === "merge-occurrence"));
});

test("ASSET_VERSION_SUPERSEDED preserves predecessor until replacement activation and resets validation", () => {
  let state = reducePromotionEvent(createEmptyRegistry(NOW), authorityEvent("OPERATOR_PROMOTION_AUTHORIZED", 20)).state;
  const supersede = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: "30000000-0000-4000-8000-000000000001",
    occurredAt: NOW,
    actorId: "trusted-operator",
    type: "ASSET_VERSION_SUPERSEDED",
    previousAssetId: "authority-asset-20",
    assetId: "authority-asset-20-v2",
    version: "2.0.0",
    canonicalPath: "policies/authority-asset-20.md",
    description: "Second major version.",
    semanticFingerprint: "semantic:v2:authority-20",
    evidenceRefs: [],
  });
  state = reducePromotionEvent(state, supersede).state;

  assert.equal(state.assets["authority-asset-20"]?.lifecycle, "PROMOTED");
  assert.equal(state.assets["authority-asset-20"]?.supersededBy, "authority-asset-20-v2");
  assert.equal(state.assets["authority-asset-20-v2"]?.lifecycle, "PROMOTED");
  assert.deepEqual(state.assets["authority-asset-20-v2"]?.tests, []);
  assert.deepEqual(state.assets["authority-asset-20-v2"]?.supersedes, ["authority-asset-20"]);

  state = transitionAsset(state, "authority-asset-20-v2", "TESTED", 101);
  for (const [offset, testType] of [
    "POSITIVE_TRIGGER",
    "NEGATIVE_TRIGGER",
    "AMBIGUOUS_TRIGGER",
    "OUTPUT_CONTRACT",
    "FAILURE_PATH",
  ].entries()) {
    const testEvent = PromotionEventV1Schema.parse({
      schema: "PromotionEvent/v1",
      eventId: `30000000-0000-4000-8000-${String(200 + offset).padStart(12, "0")}`,
      occurredAt: NOW,
      actorId: "test-suite",
      type: "ASSET_TEST_RECORDED",
      assetId: "authority-asset-20-v2",
      testId: `replacement-test-${offset}`,
      testType,
      status: "PASSED",
    });
    state = reducePromotionEvent(state, testEvent).state;
  }
  state = transitionAsset(state, "authority-asset-20-v2", "VERIFIED", 102);
  state = transitionAsset(state, "authority-asset-20-v2", "ACTIVE", 103);

  assert.equal(state.assets["authority-asset-20-v2"]?.lifecycle, "ACTIVE");
  assert.equal(state.assets["authority-asset-20"]?.lifecycle, "DEPRECATED");
});

test("registry projection hash is deterministic and checkpoints detect tampering", () => {
  const events = [
    authorityEvent("SECURITY_PROMOTION_AUTHORIZED", 30),
    authorityEvent("COMPLIANCE_PROMOTION_AUTHORIZED", 31),
  ];
  const forward = projectRegistry(events);
  const reverse = projectRegistry([...events].reverse());

  assert.equal(forward.projectionHash, reverse.projectionHash);
  assert.match(forward.projectionHash, /^sha256:[a-f0-9]{64}$/);

  const checkpoint = createRegistryCheckpoint(forward, {
    checkpointId: "40000000-0000-4000-8000-000000000001",
    createdAt: NOW,
    previousCheckpointHash: null,
  });
  assert.equal(verifyRegistryCheckpoint(checkpoint), true);
  assert.equal(verifyRegistryCheckpoint({ ...checkpoint, registryRevision: checkpoint.registryRevision + 1 }), false);
});

test("materialization receipt persists asset hash and repository commit SHA immutably", async () => {
  const dir = await mkdtemp(join(tmpdir(), "durable-materialization-"));
  try {
    const receipt = createMaterializationReceipt({
      receiptId: "50000000-0000-4000-8000-000000000001",
      assetId: "skill-one",
      assetVersion: "1.0.0",
      relativePath: ".skills/skill-one/SKILL.md",
      assetHash: HASH_A,
      registryProjectionHash: HASH_B,
      repositoryCommitSha: COMMIT_SHA,
      materializedAt: NOW,
    });
    const store = new FileMaterializationReceiptStore(dir);
    await store.append(receipt);
    const [saved] = await store.list();

    assert.equal(saved?.assetHash, HASH_A);
    assert.equal(saved?.repositoryCommitSha, COMMIT_SHA);
    await assert.rejects(() => store.append(receipt), /already exists/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test(".skills/registry.yaml is deterministic generated state and detects hand edits", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "durable-skills-"));
  try {
    let state = reducePromotionEvent(createEmptyRegistry(NOW), authorityEvent("OPERATOR_PROMOTION_AUTHORIZED", 40)).state;
    state.assets["authority-asset-40"] = {
      ...state.assets["authority-asset-40"]!,
      type: "SKILL",
      canonicalPath: ".skills/authority-asset-40/SKILL.md",
      lifecycle: "ACTIVE",
    };
    const projectionHash = `sha256:${createHash("sha256").update("projection").digest("hex")}`;
    const generated = await materializeSkillRegistryProjection(repoRoot, state, projectionHash);
    const content = await readFile(join(repoRoot, ".skills/registry.yaml"), "utf8");

    assert.match(content, /GENERATED FILE - DO NOT EDIT/);
    assert.match(content, /authority-asset-40/);
    assert.equal(await verifySkillRegistryProjection(repoRoot, state, projectionHash), true);

    await import("node:fs/promises").then(({ writeFile }) => writeFile(
      join(repoRoot, ".skills/registry.yaml"),
      `${content}\n# hand edit\n`,
      "utf8",
    ));
    assert.equal(await verifySkillRegistryProjection(repoRoot, state, projectionHash), false);
    assert.match(generated.contentHash, /^sha256:[a-f0-9]{64}$/);
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("MCP tool handlers derive authority from trusted server configuration", async () => {
  const events: PromotionEventV1[] = [];
  const handlers = createDurableAssetsToolHandlers({
    actorId: "mcp-trusted-operator",
    authorityKind: "SECURITY",
    appendEvent: async (event) => { events.push(event); },
    listEvents: async () => events,
  });

  const result = await handlers.authorizePromotion({
    assetId: "mcp-security-policy",
    patternId: "mcp-security-policy",
    assetType: "POLICY",
    version: "1.0.0",
    canonicalPath: "policies/mcp-security-policy.md",
    description: "Security policy promoted through trusted MCP boundary.",
    semanticFingerprint: "semantic:v1:mcp-security-policy",
    authorityRef: "security-approval-1",
    evidenceRefs: [],
  });

  assert.equal(result.event.type, "SECURITY_PROMOTION_AUTHORIZED");
  assert.equal(result.event.actorId, "mcp-trusted-operator");
  assert.equal(events.length, 1);
});

function transitionAsset(
  state: ReturnType<typeof createEmptyRegistry>,
  assetId: string,
  to: "TESTED" | "VERIFIED" | "ACTIVE",
  suffix: number,
) {
  const event = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: `90000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`,
    occurredAt: NOW,
    actorId: "test-suite",
    type: "LIFECYCLE_TRANSITION_REQUESTED",
    assetId,
    to,
  });
  return reducePromotionEvent(state, event).state;
}
