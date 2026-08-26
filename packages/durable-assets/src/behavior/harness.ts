import { randomUUID } from "node:crypto";
import {
  AgentBehaviorConformanceReceiptV1Schema,
  type AgentBehaviorConformanceReceiptV1,
} from "./contracts.v1.js";
import { evaluateBehaviorConformance } from "./evaluator.js";
import type { BehaviorFixture } from "./fixtures/verification-before-completion.js";
import type { ProviderBehaviorAdapter } from "./provider-adapters.js";

export async function runBehaviorConformance(
  fixture: BehaviorFixture,
  adapters: readonly ProviderBehaviorAdapter[],
  now = () => new Date().toISOString(),
  uuid = randomUUID,
): Promise<AgentBehaviorConformanceReceiptV1> {
  const evidence = [];
  for (const adapter of adapters) {
    const item = await adapter.run({
      task: fixture.task,
      sandboxRoot: fixture.sandboxRoot,
      executeDeterministicFixture: () => fixture.execute(adapter.adapterId, adapter.modelId, adapter.adapterVersion),
    });
    evidence.push(item);
  }

  const results = evidence.map(item => evaluateBehaviorConformance(fixture.task, item));
  const sameSkill = evidence.every(item => item.skillAssetId === fixture.task.skillAssetId && item.skillVersion === fixture.task.skillVersion);
  const sameProjection = evidence.every(item => item.projectionHash === fixture.task.projectionHash && item.taskHash === fixture.task.taskHash);
  const expectedAdapters = ["claude", "codex", "gemini"];
  const actualAdapters = results.map(item => item.adapterId).sort();
  const completeProviderSet = JSON.stringify(actualAdapters) === JSON.stringify(expectedAdapters);
  const behaviorallyConformant = completeProviderSet && sameSkill && sameProjection && results.every(item => item.verdict === "PASS");

  return AgentBehaviorConformanceReceiptV1Schema.parse({
    schema: "AgentBehaviorConformanceReceipt/v1",
    receiptId: uuid(),
    taskId: fixture.task.taskId,
    repositorySha: fixture.task.repositorySha,
    skillAssetId: fixture.task.skillAssetId,
    skillVersion: fixture.task.skillVersion,
    projectionHash: fixture.task.projectionHash,
    taskHash: fixture.task.taskHash,
    results,
    sameSkill,
    sameProjection,
    behaviorallyConformant,
    createdAt: now(),
  });
}
