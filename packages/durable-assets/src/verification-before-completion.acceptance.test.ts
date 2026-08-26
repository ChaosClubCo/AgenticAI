import assert from "node:assert/strict";
import test from "node:test";
import { createAgentAdapters, runCrossAgentConformance } from "./adapters/agent-adapters.js";
import { renderSkillRegistryProjection } from "./materializers/skill-registry-materializer.js";
import { projectRegistry } from "./projection/registry-projection.js";
import { PromotionEventV1Schema, type PromotionEventV1 } from "./schemas/promotion-event.v1.js";

const patternId = "verification-before-completion";
const assetId = "verification-before-completion";
const semanticFingerprint = "semantic:v1:verification-before-completion";

const evidence = [
  {
    sessionId: "repo-agents-guidelines",
    occurrenceId: "verification-occurrence-agents",
    observedAt: "2026-08-25T16:00:00.000Z",
    contentHash: "sha256:f533b868afdadfa4a5076052e1c0e5723fe9e8a08101440174b1c94879a5a1ad",
    sourceRef: "AGENTS.md#safety-first-and-data-integrity",
  },
  {
    sessionId: "durable-assets-v1-2-plan",
    occurrenceId: "verification-occurrence-plan",
    observedAt: "2026-08-25T17:00:00.000Z",
    contentHash: "sha256:2a8e0750cf082e2ea085a9241a613a6bc6ecf2466ba40763a3eac09568c1ddd6",
    sourceRef: "docs/superpowers/plans/2026-08-25-durable-assets-v1-2.md",
  },
  {
    sessionId: "pr-4-release-gate",
    occurrenceId: "verification-occurrence-pr4",
    observedAt: "2026-08-25T18:00:00.000Z",
    contentHash: "sha256:f7f104c5334e9dcc3da58a21d5c728ad3aa88cd6e6cac9e7d9333e345cfa7613",
    sourceRef: "pull/4#release-gate",
  },
] as const;

function event(input: Record<string, unknown>): PromotionEventV1 {
  return PromotionEventV1Schema.parse({ schema: "PromotionEvent/v1", ...input });
}

test("real repeated verification rule promotes, tests, activates, and resolves identically for Claude Codex and Gemini", () => {
  const events: PromotionEventV1[] = [
    ...evidence.map((item, index) => event({
      eventId: `00000000-0000-4000-8000-00000000000${index + 1}`,
      occurredAt: item.observedAt,
      actorId: "durable-assets-observer",
      type: "PATTERN_OBSERVED",
      patternId,
      semanticFingerprint,
      evidence: item,
      reusable: true,
      temporaryContext: false,
      proposedAssetType: "SKILL",
    })),
    event({ eventId: "00000000-0000-4000-8000-000000000004", occurredAt: "2026-08-25T18:01:00.000Z", actorId: "durable-assets-operator-prod", type: "ASSET_PROMOTED", assetId, patternId, assetType: "SKILL", version: "1.0.0", canonicalPath: ".skills/verification-before-completion/SKILL.md", description: "Require executed evidence before completion claims." }),
    event({ eventId: "00000000-0000-4000-8000-000000000005", occurredAt: "2026-08-25T18:02:00.000Z", actorId: "conformance", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "TESTED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000006", occurredAt: "2026-08-25T18:03:00.000Z", actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: "positive-trigger", testType: "POSITIVE_TRIGGER", status: "PASSED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000007", occurredAt: "2026-08-25T18:04:00.000Z", actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: "negative-trigger", testType: "NEGATIVE_TRIGGER", status: "PASSED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000008", occurredAt: "2026-08-25T18:05:00.000Z", actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: "ambiguous-trigger", testType: "AMBIGUOUS_TRIGGER", status: "PASSED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000009", occurredAt: "2026-08-25T18:06:00.000Z", actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: "output-contract", testType: "OUTPUT_CONTRACT", status: "PASSED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000010", occurredAt: "2026-08-25T18:07:00.000Z", actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: "failure-path", testType: "FAILURE_PATH", status: "PASSED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000011", occurredAt: "2026-08-25T18:08:00.000Z", actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "VERIFIED" }),
    event({ eventId: "00000000-0000-4000-8000-000000000012", occurredAt: "2026-08-25T18:09:00.000Z", actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "ACTIVE" }),
  ];

  const projection = projectRegistry(events);
  const candidate = projection.registry.candidates[patternId];
  const asset = projection.registry.assets[assetId];

  assert.equal(candidate?.distinctSessionCount, 3);
  assert.ok(projection.receipts.some(receipt => receipt?.decision === "PROMOTE" && receipt.patternId === patternId));
  assert.equal(asset?.lifecycle, "ACTIVE");
  assert.equal(asset?.evidenceRefs.length, 3);
  assert.ok(asset?.tests.every(record => record.status === "PASSED"));

  const adapters = createAgentAdapters();
  const conformance = runCrossAgentConformance(adapters, projection.registry, projection.projectionHash);
  assert.equal(conformance.passed, true);
  assert.equal(new Set(conformance.assetSetHashes).size, 1);

  for (const adapter of adapters) {
    const resolved = adapter.resolveActiveAssets(projection.registry);
    assert.ok(resolved.some(item => item.assetId === assetId && item.version === "1.0.0"));
    const reference = adapter.renderRegistryReference(projection.registry, projection.projectionHash);
    assert.match(reference, /verification-before-completion/);
    assert.ok(reference.includes(projection.projectionHash));
  }

  const generatedRegistry = renderSkillRegistryProjection(projection.registry, projection.projectionHash);
  assert.match(generatedRegistry, /verification-before-completion/);
  assert.match(generatedRegistry, /lifecycle: "ACTIVE"/);
});
