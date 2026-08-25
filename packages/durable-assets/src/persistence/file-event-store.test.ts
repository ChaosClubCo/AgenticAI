import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PromotionEventV1Schema } from "../schemas/promotion-event.v1.js";
import { DuplicateEventError, FilePromotionEventStore } from "./file-event-store.js";

const EVENT = PromotionEventV1Schema.parse({
  schema: "PromotionEvent/v1",
  eventId: "00000000-0000-4000-8000-000000000101",
  occurredAt: "2026-08-25T14:00:00.000Z",
  actorId: "test-suite",
  type: "PATTERN_OBSERVED",
  patternId: "security-review",
  semanticFingerprint: "semantic:v1:security-review",
  evidence: {
    sessionId: "session-one",
    occurrenceId: "occurrence-one",
    observedAt: "2026-08-25T14:00:00.000Z",
    contentHash: `sha256:${"b".repeat(64)}`,
  },
  reusable: true,
  temporaryContext: false,
  proposedAssetType: "SKILL",
});

test("event store is append-only by event id", async () => {
  const root = await mkdtemp(join(tmpdir(), "durable-events-"));
  const store = new FilePromotionEventStore(root);

  try {
    await store.append(EVENT);
    await assert.rejects(() => store.append(EVENT), DuplicateEventError);

    const events = await store.list();
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], EVENT);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
