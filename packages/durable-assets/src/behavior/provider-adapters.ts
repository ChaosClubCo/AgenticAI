import type {
  BehaviorAdapterId,
  BehaviorConformanceTaskV1,
  BehaviorExecutionEvidenceV1,
} from "./contracts.v1.js";

export interface BehaviorExecutionContext {
  readonly adapterId: BehaviorAdapterId;
  readonly modelId: string;
  readonly adapterVersion: string;
  readonly task: BehaviorConformanceTaskV1;
  readonly sandboxRoot: string;
  executeDeterministicFixture(): Promise<BehaviorExecutionEvidenceV1>;
}

export type ProviderRunner = (context: BehaviorExecutionContext) => Promise<BehaviorExecutionEvidenceV1>;

export interface ProviderBehaviorAdapter {
  readonly adapterId: BehaviorAdapterId;
  readonly modelId: string;
  readonly adapterVersion: string;
  run(context: Omit<BehaviorExecutionContext, "adapterId" | "modelId" | "adapterVersion">): Promise<BehaviorExecutionEvidenceV1>;
}

export interface ProviderRunnerMap {
  claude: ProviderRunner;
  codex: ProviderRunner;
  gemini: ProviderRunner;
}

export function createProviderAdapters(runners: ProviderRunnerMap): ProviderBehaviorAdapter[] {
  return (["claude", "codex", "gemini"] as const).map(adapterId => ({
    adapterId,
    modelId: `${adapterId}-runtime`,
    adapterVersion: "1.0.0",
    run(context) {
      return runners[adapterId]({
        ...context,
        adapterId,
        modelId: `${adapterId}-runtime`,
        adapterVersion: "1.0.0",
      });
    },
  }));
}
