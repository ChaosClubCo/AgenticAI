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

export function createGeminiLiveRunner(config: LiveRunnerConfig): LiveProviderRunner {
  const fetchImpl = config.fetchImpl ?? fetch;
  const maxTurns = config.maxTurns ?? 6;
  return {
    adapterId: "gemini",
    modelId: config.model,
    adapterVersion: "1.0.0",
    async run(fixture: BehaviorFixture) {
      if (!config.apiKey) throw new ProviderUnavailableError("gemini");
      const recorder = createActionRecorder(fixture);
      let previousInteractionId: string | undefined;
      let input: unknown = fixture.task.instruction;
      const tools = LIVE_TOOL_DEFINITIONS.map(tool => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));

      for (let turn = 0; turn < maxTurns; turn += 1) {
        const response = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": config.apiKey,
          },
          body: JSON.stringify({
            model: config.model,
            system_instruction: LIVE_SYSTEM_INSTRUCTION,
            input,
            tools,
            ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
          }),
        });
        const payload = await requireJson(response, "Gemini");
        if (!isRecord(payload) || typeof payload.id !== "string" || !Array.isArray(payload.steps)) throw new Error("Gemini interaction is missing steps.");
        previousInteractionId = payload.id;
        const outputs: unknown[] = [];
        for (const step of payload.steps) {
          if (!isRecord(step) || step.type !== "function_call" || typeof step.id !== "string" || typeof step.name !== "string") continue;
          const result = await recorder.execute(step.name, step.arguments);
          outputs.push({
            type: "function_result",
            name: step.name,
            call_id: step.id,
            result: [{ type: "text", text: JSON.stringify(result) }],
          });
        }
        if (outputs.length === 0 || recorder.terminal) break;
        input = outputs;
      }

      return buildEvidence(fixture, "gemini", config.model, "1.0.0", recorder.actions);
    },
  };
}
