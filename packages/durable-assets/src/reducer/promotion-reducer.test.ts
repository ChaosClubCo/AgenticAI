import assert from "node:assert/strict";
import test from "node:test";
import { PromotionEventV1Schema, type PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import { createEmptyRegistry, reducePromotionEvent } from "./promotion-reducer.js";

const HASH = `sha256:${"a".repeat(64)}`;
const TIMES = [
  "2026-08-25T14:00:00.000Z",
  "2026-08-25T14:01:00.000Z",
  "2026-08-25T14:02:00.000Z",
  "2026-08-25T14:03:00.000Z",
  "2026-08-25T14:04:00.000Z",
  "2026-08-25T14:05:00.000Z",
] as const;

function observed(index: number, sessionId: string, occurrenceId: string): PromotionEventV1 {
  return PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    occurredAt: TIMES[Math.min(index, TIMES.length - 1)],
    actorId: "test-suite",
    type: "PATTERN_OBSERVED",
    patternId: "security-review",
    semanticFingerprint: "semantic:v1:security-review",
    evidence: { sessionId, occurrenceId, observedAt: TIMES[Math.min(index, TIMES.length - 1)], contentHash: HASH },
    reusable: true,
    temporaryContext: false,
    proposedAssetType: "SKILL",
  });
}

test("three repetitions in one session do not trigger promotion", () => {
  let state = createEmptyRegistry(TIMES[0]);
  let receipt: unknown;

  for (let index = 0; index < 3; index += 1) {
    const result = reducePromotionEvent(state, observed(index, "session-one", `occurrence-${index}`));
    state = result.state;
    receipt = result.receipt;
  }

  assert.equal(state.candidates["security-review"]?.distinctSessionCount, 1);
  assert.equal(receipt, undefined);
});

test("third distinct session emits deterministic promotion receipt", () => {
  let state = createEmptyRegistry(TIMES[0]);
  let receipt;

  for (let index = 0; index < 3; index += 1) {
    const result = reducePromotionEvent(state, observed(index, `session-${index}`, `occurrence-${index}`));
    state = result.state;
    receipt = result.receipt ?? receipt;
  }

  assert.equal(receipt?.decision, "PROMOTE");
  assert.equal(receipt?.distinctSessionCount, 3);
  assert.equal(receipt?.receiptId, "00000000-0000-4000-8000-000000000003");
});

test("event replay is idempotent and does not increment revision", () => {
  const initial = createEmptyRegistry(TIMES[0]);
  const event = observed(0, "session-one", "occurrence-one");
  const first = reducePromotionEvent(initial, event);
  const replay = reducePromotionEvent(first.state, event);

  assert.equal(first.state.revision, 1);
  assert.equal(replay.state.revision, 1);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.state, first.state);
});

test("duplicate occurrence ids do not inflate evidence count", () => {
  let state = createEmptyRegistry(TIMES[0]);
  state = reducePromotionEvent(state, observed(0, "session-one", "same-occurrence")).state;
  state = reducePromotionEvent(state, observed(1, "session-two", "same-occurrence")).state;

  assert.equal(state.candidates["security-review"]?.occurrenceCount, 1);
  assert.equal(state.candidates["security-review"]?.distinctSessionCount, 1);
});

test("lifecycle cannot skip transitions", () => {
  let state = seededPromotedAsset();
  const event = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: "00000000-0000-4000-8000-000000000020",
    occurredAt: TIMES[4],
    actorId: "test-suite",
    type: "LIFECYCLE_TRANSITION_REQUESTED",
    assetId: "security-review",
    to: "ACTIVE",
  });

  assert.throws(() => reducePromotionEvent(state, event), /Invalid lifecycle transition/);
});

test("verified and active states require all required tests to pass", () => {
  let state = seededPromotedAsset();
  state = transition(state, "TESTED", 20);

  for (const [offset, testType] of [
    "POSITIVE_TRIGGER",
    "NEGATIVE_TRIGGER",
    "AMBIGUOUS_TRIGGER",
    "OUTPUT_CONTRACT",
    "FAILURE_PATH",
  ].entries()) {
    const event = PromotionEventV1Schema.parse({
      schema: "PromotionEvent/v1",
      eventId: `00000000-0000-4000-8000-${String(30 + offset).padStart(12, "0")}`,
      occurredAt: TIMES[5],
      actorId: "test-suite",
      type: "ASSET_TEST_RECORDED",
      assetId: "security-review",
      testId: `required-test-${offset}`,
      testType,
      status: "PASSED",
    });
    state = reducePromotionEvent(state, event).state;
  }

  state = transition(state, "VERIFIED", 40);
  state = transition(state, "ACTIVE", 41);
  assert.equal(state.assets["security-review"]?.lifecycle, "ACTIVE");
});

function seededPromotedAsset() {
  let state = createEmptyRegistry(TIMES[0]);
  for (let index = 0; index < 3; index += 1) {
    state = reducePromotionEvent(state, observed(index, `session-${index}`, `occurrence-${index}`)).state;
  }

  const promoted = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: "00000000-0000-4000-8000-000000000010",
    occurredAt: TIMES[3],
    actorId: "test-suite",
    type: "ASSET_PROMOTED",
    assetId: "security-review",
    patternId: "security-review",
    assetType: "SKILL",
    version: "1.0.0",
    canonicalPath: ".skills/security-review/SKILL.md",
    description: "Security-first code review behavior.",
  });

  return reducePromotionEvent(state, promoted).state;
}

function transition(state: ReturnType<typeof createEmptyRegistry>, to: "TESTED" | "VERIFIED" | "ACTIVE", id: number) {
  const event = PromotionEventV1Schema.parse({
    schema: "PromotionEvent/v1",
    eventId: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    occurredAt: TIMES[5],
    actorId: "test-suite",
    type: "LIFECYCLE_TRANSITION_REQUESTED",
    assetId: "security-review",
    to,
  });
  return reducePromotionEvent(state, event).state;
}
