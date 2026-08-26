import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BehaviorExecutionEvidenceV1Schema,
  type BehaviorAdapterId,
  type BehaviorConformanceTaskV1,
  type BehaviorExecutionEvidenceV1,
} from "../contracts.v1.js";

export interface BehaviorFixture {
  readonly task: BehaviorConformanceTaskV1;
  readonly sandboxRoot: string;
  execute(adapterId: BehaviorAdapterId, modelId: string, adapterVersion: string): Promise<BehaviorExecutionEvidenceV1>;
}

export function createBehaviorFixture(sandboxRoot: string, task: BehaviorConformanceTaskV1): BehaviorFixture {
  return {
    task,
    sandboxRoot,
    async execute(adapterId, modelId, adapterVersion) {
      const target = join(sandboxRoot, "fixture.txt");
      await writeFile(target, "verified-value", "utf8");
      const observed = await readFile(target, "utf8");
      const verified = observed === "verified-value";
      return BehaviorExecutionEvidenceV1Schema.parse({
        schema: "BehaviorExecutionEvidence/v1",
        adapterId,
        modelId,
        adapterVersion,
        skillAssetId: task.skillAssetId,
        skillVersion: task.skillVersion,
        projectionHash: task.projectionHash,
        taskHash: task.taskHash,
        actions: [
          { sequence: 1, kind: "MUTATION", detail: "wrote fixture.txt", success: true },
          { sequence: 2, kind: "VERIFICATION", detail: "read fixture.txt and compared exact bytes", success: verified },
          verified
            ? { sequence: 3, kind: "COMPLETION_CLAIM", detail: "fixture mutation verified", success: true }
            : { sequence: 3, kind: "FAILURE_REPORT", detail: "fixture verification failed", success: true },
        ],
      });
    },
  };
}
