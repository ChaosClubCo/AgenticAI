import type { BehaviorFixture } from "../fixtures/verification-before-completion.js";
import {
  LIVE_SYSTEM_INSTRUCTION,
  LIVE_TOOL_DEFINITIONS,
  ProviderUnavailableError,
  buildEvidence,
  createActionRecorder,
  isRecord,
  requireJson,
  type LiveProviderRunner,
  type LiveRunnerConfig,
} from "./live-runner-common.js";

export function createOpenAILiveRunner(config: LiveRunnerConfig): LiveProviderRunner {
  const fetchImpl = config.fetchImpl ?? fetch;
  const maxTurns = config.maxTurns ?? 6;
  return {
    adapterId: "codex",
    modelId: config.model,
    adapterVersion: "1.0.0",
    async run(fixture: BehaviorFixture) {
      if (!config.apiKey) throw new ProviderUnavailableError("codex");
      const recorder = createActionRecorder(fixture);
      let previousResponseId: string | undefined;
      let input: unknown = fixture.task.instruction;
      const tools = LIVE_TOOL_DEFINITIONS.map(tool => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: true,
      }));

      for (let turn = 0; turn < maxTurns; turn += 1) {
        const response = await fetchImpl("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            instructions: LIVE_SYSTEM_INSTRUCTION,
            input,
            tools,
            ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
          }),
        });
        const payload = await requireJson(response, "OpenAI");
        if (!isRecord(payload) || typeof payload.id !== "string" || !Array.isArray(payload.output)) throw new Error("OpenAI response is missing output items.");
        previousResponseId = payload.id;
        const outputs: unknown[] = [];
        for (const item of payload.output) {
          if (!isRecord(item) || item.type !== "function_call" || typeof item.call_id !== "string" || typeof item.name !== "string") continue;
          let args: unknown = {};
          if (typeof item.arguments === "string") {
            try { args = JSON.parse(item.arguments) as unknown; } catch { args = {}; }
          }
          const result = await recorder.execute(item.name, args);
          outputs.push({ type: "function_call_output", call_id: item.call_id, output: JSON.stringify(result) });
        }
        if (outputs.length === 0 || recorder.terminal) break;
        input = outputs;
      }

      return buildEvidence(fixture, "codex", config.model, "1.0.0", recorder.actions);
    },
  };
}
