import { projectRegistry } from "../../projection/registry-projection.js";
import { PromotionEventV1Schema, type PromotionEventV1 } from "../../schemas/promotion-event.v1.js";

export function createVerificationBeforeCompletionProjection() {
  const patternId = "verification-before-completion";
  const assetId = "verification-before-completion";
  const semanticFingerprint = "semantic:v1:verification-before-completion";
  const evidence = [
    { sessionId: "repo-agents-guidelines", occurrenceId: "verification-occurrence-agents", observedAt: "2026-08-25T16:00:00.000Z", contentHash: "sha256:f533b868afdadfa4a5076052e1c0e5723fe9e8a08101440174b1c94879a5a1ad", sourceRef: "AGENTS.md#safety-first-and-data-integrity" },
    { sessionId: "durable-assets-v1-2-plan", occurrenceId: "verification-occurrence-plan", observedAt: "2026-08-25T17:00:00.000Z", contentHash: "sha256:2a8e0750cf082e2ea085a9241a613a6bc6ecf2466ba40763a3eac09568c1ddd6", sourceRef: "docs/superpowers/plans/2026-08-25-durable-assets-v1-2.md" },
    { sessionId: "pr-4-release-gate", occurrenceId: "verification-occurrence-pr4", observedAt: "2026-08-25T18:00:00.000Z", contentHash: "sha256:f7f104c5334e9dcc3da58a21d5c728ad3aa88cd6e6cac9e7d9333e345cfa7613", sourceRef: "pull/4#release-gate" },
  ] as const;
  const parse = (value: unknown): PromotionEventV1 => PromotionEventV1Schema.parse(value);
  const events: PromotionEventV1[] = evidence.map((item, index) => parse({ schema: "PromotionEvent/v1", eventId: `00000000-0000-4000-8000-00000000000${index + 1}`, occurredAt: item.observedAt, actorId: "durable-assets-observer", type: "PATTERN_OBSERVED", patternId, semanticFingerprint, evidence: item, reusable: true, temporaryContext: false, proposedAssetType: "SKILL" }));
  events.push(parse({ schema: "PromotionEvent/v1", eventId: "00000000-0000-4000-8000-000000000004", occurredAt: "2026-08-25T18:01:00.000Z", actorId: "durable-assets-operator-prod", type: "ASSET_PROMOTED", assetId, patternId, assetType: "SKILL", version: "1.0.0", canonicalPath: ".skills/verification-before-completion/SKILL.md", description: "Require executed evidence before completion claims." }));
  events.push(parse({ schema: "PromotionEvent/v1", eventId: "00000000-0000-4000-8000-000000000005", occurredAt: "2026-08-25T18:02:00.000Z", actorId: "conformance", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "TESTED" }));
  const testTypes = ["POSITIVE_TRIGGER", "NEGATIVE_TRIGGER", "AMBIGUOUS_TRIGGER", "OUTPUT_CONTRACT", "FAILURE_PATH"] as const;
  testTypes.forEach((testType, index) => events.push(parse({ schema: "PromotionEvent/v1", eventId: `00000000-0000-4000-8000-00000000001${index}`, occurredAt: `2026-08-25T18:0${index + 3}:00.000Z`, actorId: "conformance", type: "ASSET_TEST_RECORDED", assetId, testId: `behavior-${index}`, testType, status: "PASSED" })));
  events.push(parse({ schema: "PromotionEvent/v1", eventId: "00000000-0000-4000-8000-000000000020", occurredAt: "2026-08-25T18:08:00.000Z", actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "VERIFIED" }));
  events.push(parse({ schema: "PromotionEvent/v1", eventId: "00000000-0000-4000-8000-000000000021", occurredAt: "2026-08-25T18:09:00.000Z", actorId: "durable-assets-operator-prod", type: "LIFECYCLE_TRANSITION_REQUESTED", assetId, to: "ACTIVE" }));
  return projectRegistry(events);
}
