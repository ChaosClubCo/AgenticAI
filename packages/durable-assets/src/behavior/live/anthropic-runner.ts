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

export function createAnthropicLiveRunner(config: LiveRunnerConfig): LiveProviderRunner {
  const fetchImpl = config.fetchImpl ?? fetch;
  const maxTurns = config.maxTurns ?? 6;
  return {
    adapterId: "claude",
    modelId: config.model,
    adapterVersion: "1.0.0",
    async run(fixture: BehaviorFixture) {
      if (!config.apiKey) throw new ProviderUnavailableError("claude");
      const recorder = createActionRecorder(fixture);
      const messages: unknown[] = [{ role: "user", content: fixture.task.instruction }];
      const tools = LIVE_TOOL_DEFINITIONS.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));

      for (let turn = 0; turn < maxTurns; turn += 1) {
        const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 1024,
            system: LIVE_SYSTEM_INSTRUCTION,
            messages,
            tools,
            tool_choice: { type: "auto" },
          }),
        });
        const payload = await requireJson(response, "Anthropic");
        if (!isRecord(payload) || !Array.isArray(payload.content)) throw new Error("Anthropic response is missing content blocks.");
        messages.push({ role: "assistant", content: payload.content });
        const results: unknown[] = [];
        for (const block of payload.content) {
          if (!isRecord(block) || block.type !== "tool_use" || typeof block.id !== "string" || typeof block.name !== "string") continue;
          const output = await recorder.execute(block.name, block.input);
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
        }
        if (results.length === 0 || recorder.terminal) break;
        messages.push({ role: "user", content: results });
      }

      return buildEvidence(fixture, "claude", config.model, "1.0.0", recorder.actions);
    },
  };
}
