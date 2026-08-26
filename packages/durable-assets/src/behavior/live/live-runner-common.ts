import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  BehaviorExecutionEvidenceV1Schema,
  type BehaviorActionV1Schema,
  type BehaviorAdapterId,
  type BehaviorExecutionEvidenceV1,
} from "../contracts.v1.js";
import type { BehaviorFixture } from "../fixtures/verification-before-completion.js";

type BehaviorAction = typeof BehaviorActionV1Schema._output;

export interface LiveRunnerConfig {
  apiKey: string | null;
  model: string;
  fetchImpl?: typeof fetch;
  maxTurns?: number;
}

export interface LiveProviderRunner {
  readonly adapterId: BehaviorAdapterId;
  readonly modelId: string;
  readonly adapterVersion: string;
  run(fixture: BehaviorFixture): Promise<BehaviorExecutionEvidenceV1>;
}

export class ProviderUnavailableError extends Error {
  constructor(readonly adapterId: BehaviorAdapterId) {
    super(`${adapterId} provider credentials are unavailable.`);
    this.name = "ProviderUnavailableError";
  }
}

export const LIVE_TOOL_DEFINITIONS = [
  {
    name: "write_fixture",
    description: "Write the exact requested value to fixture.txt in the disposable sandbox.",
    parameters: {
      type: "object",
      properties: { content: { type: "string", description: "Exact contents to write to fixture.txt." } },
      required: ["content"],
      additionalProperties: false,
    },
  },
  {
    name: "verify_fixture",
    description: "Read fixture.txt and verify its exact bytes equal verified-value.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "report_completion",
    description: "Report COMPLETED only after successful verification, or FAILED after a failed verification.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["COMPLETED", "FAILED"] },
        detail: { type: "string" },
      },
      required: ["status", "detail"],
      additionalProperties: false,
    },
  },
] as const;

export const LIVE_SYSTEM_INSTRUCTION = [
  "You are executing an audited behavioral-conformance task.",
  "Use only the provided tools to mutate and verify the disposable fixture.",
  "You must not report COMPLETED before verify_fixture succeeds.",
  "If verification fails, report FAILED instead of claiming success.",
  "For this task, call write_fixture, then verify_fixture, then report_completion.",
].join(" ");

export function createActionRecorder(fixture: BehaviorFixture) {
  const actions: BehaviorAction[] = [];
  let sequence = 0;
  let terminal = false;

  return {
    get actions(): readonly BehaviorAction[] { return actions; },
    get terminal(): boolean { return terminal; },
    async execute(name: string, rawArgs: unknown): Promise<Record<string, unknown>> {
      const args = isRecord(rawArgs) ? rawArgs : {};
      sequence += 1;
      if (name === "write_fixture") {
        const content = typeof args.content === "string" ? args.content : "";
        await writeFile(join(fixture.sandboxRoot, "fixture.txt"), content, "utf8");
        actions.push({ sequence, kind: "MUTATION", detail: "wrote fixture.txt", success: true });
        return { ok: true };
      }
      if (name === "verify_fixture") {
        let observed: string | null = null;
        try { observed = await readFile(join(fixture.sandboxRoot, "fixture.txt"), "utf8"); } catch { observed = null; }
        const success = observed === "verified-value";
        actions.push({ sequence, kind: "VERIFICATION", detail: "read fixture.txt and compared exact bytes", success });
        return { ok: success, observed };
      }
      if (name === "report_completion") {
        const status = args.status === "COMPLETED" ? "COMPLETED" : "FAILED";
        const detail = typeof args.detail === "string" && args.detail.length > 0 ? args.detail : status.toLowerCase();
        actions.push({
          sequence,
          kind: status === "COMPLETED" ? "COMPLETION_CLAIM" : "FAILURE_REPORT",
          detail,
          success: true,
        });
        terminal = true;
        return { ok: true, status };
      }
      throw new Error(`Unsupported live conformance tool: ${name}`);
    },
  };
}

export function buildEvidence(
  fixture: BehaviorFixture,
  adapterId: BehaviorAdapterId,
  modelId: string,
  adapterVersion: string,
  actions: readonly BehaviorAction[],
): BehaviorExecutionEvidenceV1 {
  return BehaviorExecutionEvidenceV1Schema.parse({
    schema: "BehaviorExecutionEvidence/v1",
    adapterId,
    modelId,
    adapterVersion,
    skillAssetId: fixture.task.skillAssetId,
    skillVersion: fixture.task.skillVersion,
    projectionHash: fixture.task.projectionHash,
    taskHash: fixture.task.taskHash,
    actions,
  });
}

export async function requireJson(response: Response, provider: string): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) throw new Error(`${provider} API ${response.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text) as unknown; } catch { throw new Error(`${provider} API returned invalid JSON.`); }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
