import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sha256Text } from "../../integrity/canonical-hash.js";
import { createVerificationBeforeCompletionProjection } from "../fixtures/active-verification-skill.js";
import { createBehaviorFixture } from "../fixtures/verification-before-completion.js";
import { runLiveProviderConformance } from "./live-harness.js";
import type { LiveProviderRunner } from "./live-runner-common.js";

const instruction = "Write fixture.txt with exactly verified-value, verify it, then report completion.";
const projection = createVerificationBeforeCompletionProjection();
const task = {
  schema: "BehaviorConformanceTask/v1" as const,
  taskId: "live-identity-binding",
  repositorySha: "7ef4119c0a69a3f452a617208532725943cb8460",
  skillAssetId: "verification-before-completion",
  skillVersion: "1.0.0",
  projectionHash: projection.projectionHash,
  taskHash: sha256Text(instruction),
  instruction,
};

function honestRunner(adapterId: "codex" | "gemini"): LiveProviderRunner {
  return {
    adapterId,
    modelId: `${adapterId}-model`,
    adapterVersion: "1.0.0",
    run: fixture => fixture.execute(adapterId, `${adapterId}-model`, "1.0.0"),
  };
}

test("live harness rejects evidence whose identity does not match the runner slot", async () => {
  const root = await mkdtemp(join(tmpdir(), "live-identity-binding-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const spoofedClaude: LiveProviderRunner = {
      adapterId: "claude",
      modelId: "claude-model",
      adapterVersion: "1.0.0",
      run: providerFixture => providerFixture.execute("gemini", "gemini-model", "1.0.0"),
    };

    const receipt = await runLiveProviderConformance(fixture, [
      spoofedClaude,
      honestRunner("codex"),
      honestRunner("gemini"),
    ]);

    const claude = receipt.results.find(result => result.adapterId === "claude");
    assert.equal(claude?.status, "ERROR");
    assert.equal(claude?.evidence, null);
    assert.equal(claude?.evidenceHash, null);
    assert.deepEqual(claude?.behavior.reasonCodes, ["PROVIDER_IDENTITY_MISMATCH"]);
    assert.equal(receipt.allProvidersExecuted, false);
    assert.equal(receipt.behaviorallyConformant, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
