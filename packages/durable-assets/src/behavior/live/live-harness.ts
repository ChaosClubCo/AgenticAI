import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { sha256Canonical } from "../../integrity/canonical-hash.js";
import {
  AgentBehaviorResultV1Schema,
  LiveAgentBehaviorConformanceReceiptV1Schema,
  type AgentBehaviorResultV1,
  type LiveAgentBehaviorConformanceReceiptV1,
  type LiveProviderBehaviorResultV1,
} from "../contracts.v1.js";
import { evaluateBehaviorConformance } from "../evaluator.js";
import { createBehaviorFixture, type BehaviorFixture } from "../fixtures/verification-before-completion.js";
import { ProviderUnavailableError, type LiveProviderRunner } from "./live-runner-common.js";

const EXPECTED = ["claude", "codex", "gemini"] as const;

export async function runLiveProviderConformance(
  fixture: BehaviorFixture,
  runners: readonly LiveProviderRunner[],
  now = () => new Date().toISOString(),
  uuid = randomUUID,
): Promise<LiveAgentBehaviorConformanceReceiptV1> {
  const results: LiveProviderBehaviorResultV1[] = [];
  const evidenceContexts: Array<{ skillAssetId: string; skillVersion: string; projectionHash: string; taskHash: string }> = [];
  const providerRoot = join(fixture.sandboxRoot, ".live-providers");
  await mkdir(providerRoot, { recursive: true });

  for (const runner of runners) {
    const sandboxRoot = join(providerRoot, runner.adapterId);
    await rm(sandboxRoot, { recursive: true, force: true });
    await mkdir(sandboxRoot, { recursive: true });
    const providerFixture = createBehaviorFixture(sandboxRoot, fixture.task);

    try {
      const evidence = await runner.run(providerFixture);
      evidenceContexts.push(evidence);
      results.push({
        adapterId: runner.adapterId,
        modelId: runner.modelId,
        status: "EXECUTED",
        evidence,
        evidenceHash: sha256Canonical(evidence),
        behavior: evaluateBehaviorConformance(fixture.task, evidence),
      });
    } catch (error) {
      const unavailable = error instanceof ProviderUnavailableError;
      results.push({
        adapterId: runner.adapterId,
        modelId: runner.modelId,
        status: unavailable ? "UNAVAILABLE" : "ERROR",
        evidence: null,
        evidenceHash: null,
        behavior: inconclusive(runner.adapterId, runner.modelId, unavailable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR"),
      });
    }
  }

  results.sort((a, b) => a.adapterId.localeCompare(b.adapterId));
  const adapters = results.map(item => item.adapterId).sort();
  const completeProviderSet = JSON.stringify(adapters) === JSON.stringify([...EXPECTED].sort());
  const allProvidersExecuted = completeProviderSet && results.every(item => item.status === "EXECUTED");
  const sameSkill = evidenceContexts.length > 0 && evidenceContexts.every(item => item.skillAssetId === fixture.task.skillAssetId && item.skillVersion === fixture.task.skillVersion);
  const sameProjection = evidenceContexts.length > 0 && evidenceContexts.every(item => item.projectionHash === fixture.task.projectionHash && item.taskHash === fixture.task.taskHash);
  const behaviorallyConformant = allProvidersExecuted && sameSkill && sameProjection && results.every(item => item.behavior.verdict === "PASS");

  return LiveAgentBehaviorConformanceReceiptV1Schema.parse({
    schema: "LiveAgentBehaviorConformanceReceipt/v1",
    receiptId: uuid(),
    taskId: fixture.task.taskId,
    repositorySha: fixture.task.repositorySha,
    skillAssetId: fixture.task.skillAssetId,
    skillVersion: fixture.task.skillVersion,
    projectionHash: fixture.task.projectionHash,
    taskHash: fixture.task.taskHash,
    results,
    allProvidersExecuted,
    sameSkill,
    sameProjection,
    behaviorallyConformant,
    createdAt: now(),
  });
}

function inconclusive(adapterId: "claude" | "codex" | "gemini", modelId: string, reason: string): AgentBehaviorResultV1 {
  return AgentBehaviorResultV1Schema.parse({
    schema: "AgentBehaviorResult/v1",
    adapterId,
    modelId,
    verdict: "INCONCLUSIVE",
    verificationExecuted: false,
    completionClaimed: false,
    claimSupported: false,
    failureReportedAccurately: false,
    reasonCodes: [reason],
  });
}
