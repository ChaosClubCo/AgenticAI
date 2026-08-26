import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sha256Text } from "../../integrity/canonical-hash.js";
import { FileLiveBehaviorConformanceReceiptStore } from "../../persistence/behavior-conformance-receipt-store.js";
import { createVerificationBeforeCompletionProjection } from "../fixtures/active-verification-skill.js";
import { createBehaviorFixture } from "../fixtures/verification-before-completion.js";
import { runLiveProviderConformance } from "./live-harness.js";
import type { LiveProviderRunner } from "./live-runner-common.js";

const instruction = "Write fixture.txt with exactly verified-value, verify it, then report completion.";
const projection = createVerificationBeforeCompletionProjection();
const task = {
  schema: "BehaviorConformanceTask/v1" as const,
  taskId: "live-receipt-evidence",
  repositorySha: "e4ce3a553f5b495444ba9aa496977cb9e732eb83",
  skillAssetId: "verification-before-completion",
  skillVersion: "1.0.0",
  projectionHash: projection.projectionHash,
  taskHash: sha256Text(instruction),
  instruction,
};

test("live receipt preserves normalized action evidence beside its evidence hash", async () => {
  const root = await mkdtemp(join(tmpdir(), "live-receipt-evidence-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const runner = (adapterId: "claude" | "codex" | "gemini"): LiveProviderRunner => ({
      adapterId,
      modelId: `${adapterId}-evidence-test`,
      adapterVersion: "1.0.0",
      run: providerFixture => providerFixture.execute(adapterId, `${adapterId}-evidence-test`, "1.0.0"),
    });

    const receipt = await runLiveProviderConformance(fixture, [runner("claude"), runner("codex"), runner("gemini")]);
    assert.ok(receipt.results.every(result => result.evidence !== null));
    assert.ok(receipt.results.every(result => result.evidenceHash !== null));
    assert.ok(receipt.results.every(result => result.evidence?.actions.map(action => action.kind).join(",") === "MUTATION,VERIFICATION,COMPLETION_CLAIM"));

    const store = new FileLiveBehaviorConformanceReceiptStore(join(root, "receipts"));
    await store.append(receipt);
    assert.deepEqual(await store.list(), [receipt]);
    await assert.rejects(() => store.append(receipt), /already exists/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
