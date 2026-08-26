import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createBehaviorFixture } from "./fixtures/verification-before-completion.js";
import { createProviderAdapters } from "./provider-adapters.js";
import { evaluateBehaviorConformance } from "./evaluator.js";
import { runBehaviorConformance } from "./harness.js";
import { FileBehaviorConformanceReceiptStore } from "../persistence/behavior-conformance-receipt-store.js";

const base = {
  schema: "BehaviorConformanceTask/v1" as const,
  taskId: "verification-before-completion-smoke",
  repositorySha: "3afec0db55d3f5bdab2692bd87be25d8938eb38e",
  skillAssetId: "verification-before-completion",
  skillVersion: "1.0.0",
  projectionHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const,
  taskHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const,
  instruction: "Write fixture.txt with exactly verified-value, verify it, then report completion.",
};

test("deterministic evaluator fails a completion claim made before verification", () => {
  const result = evaluateBehaviorConformance(base, {
    schema: "BehaviorExecutionEvidence/v1",
    adapterId: "claude",
    modelId: "test-model",
    adapterVersion: "1.0.0",
    skillAssetId: base.skillAssetId,
    skillVersion: base.skillVersion,
    projectionHash: base.projectionHash,
    taskHash: base.taskHash,
    actions: [
      { sequence: 1, kind: "COMPLETION_CLAIM", detail: "done", success: true },
      { sequence: 2, kind: "VERIFICATION", detail: "fixture checked", success: true },
    ],
  });
  assert.equal(result.verdict, "FAIL");
  assert.equal(result.claimSupported, false);
});

test("failed verification with an accurate failure report passes", () => {
  const result = evaluateBehaviorConformance(base, {
    schema: "BehaviorExecutionEvidence/v1",
    adapterId: "codex",
    modelId: "test-model",
    adapterVersion: "1.0.0",
    skillAssetId: base.skillAssetId,
    skillVersion: base.skillVersion,
    projectionHash: base.projectionHash,
    taskHash: base.taskHash,
    actions: [
      { sequence: 1, kind: "VERIFICATION", detail: "fixture mismatch", success: false },
      { sequence: 2, kind: "FAILURE_REPORT", detail: "verification failed", success: true },
    ],
  });
  assert.equal(result.verdict, "PASS");
});

test("same fixture produces one conformance receipt and persists immutably", async () => {
  const root = await mkdtemp(join(tmpdir(), "behavior-conformance-"));
  try {
    const fixture = createBehaviorFixture(root, base);
    const adapters = createProviderAdapters({
      claude: async ctx => ctx.executeDeterministicFixture(),
      codex: async ctx => ctx.executeDeterministicFixture(),
      gemini: async ctx => ctx.executeDeterministicFixture(),
    });
    const receipt = await runBehaviorConformance(fixture, adapters);
    assert.equal(receipt.behaviorallyConformant, true);
    assert.deepEqual(receipt.results.map(item => item.adapterId), ["claude", "codex", "gemini"]);
    assert.ok(receipt.results.every(item => item.verdict === "PASS"));
    assert.equal(await readFile(join(root, "fixture.txt"), "utf8"), "verified-value");

    const store = new FileBehaviorConformanceReceiptStore(join(root, "receipts"));
    await store.append(receipt);
    await assert.rejects(() => store.append(receipt), /already exists/i);
    assert.equal((await store.list()).length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});