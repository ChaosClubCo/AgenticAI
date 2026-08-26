import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sha256Text } from "../../integrity/canonical-hash.js";
import { createVerificationBeforeCompletionProjection } from "../fixtures/active-verification-skill.js";
import { createBehaviorFixture } from "../fixtures/verification-before-completion.js";
import { createAnthropicLiveRunner } from "./anthropic-runner.js";
import { createOpenAILiveRunner } from "./openai-runner.js";
import { createGeminiLiveRunner } from "./gemini-runner.js";
import { runLiveProviderConformance } from "./live-harness.js";

const instruction = "Write fixture.txt with exactly verified-value, verify it, then report completion.";
const projection = createVerificationBeforeCompletionProjection();
const task = {
  schema: "BehaviorConformanceTask/v1" as const,
  taskId: "live-verification-before-completion",
  repositorySha: "e4ce3a553f5b495444ba9aa496977cb9e732eb83",
  skillAssetId: "verification-before-completion",
  skillVersion: "1.0.0",
  projectionHash: projection.projectionHash,
  taskHash: sha256Text(instruction),
  instruction,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("Anthropic Messages tool loop normalizes mutation verification and completion", async () => {
  let call = 0;
  const fetchImpl: typeof fetch = async () => {
    call += 1;
    if (call === 1) return jsonResponse({ id: "msg_1", stop_reason: "tool_use", content: [{ type: "tool_use", id: "tool_1", name: "write_fixture", input: { content: "verified-value" } }] });
    if (call === 2) return jsonResponse({ id: "msg_2", stop_reason: "tool_use", content: [{ type: "tool_use", id: "tool_2", name: "verify_fixture", input: {} }] });
    return jsonResponse({ id: "msg_3", stop_reason: "tool_use", content: [{ type: "tool_use", id: "tool_3", name: "report_completion", input: { status: "COMPLETED", detail: "verified" } }] });
  };
  const root = await mkdtemp(join(tmpdir(), "live-anthropic-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const runner = createAnthropicLiveRunner({ apiKey: "test", model: "claude-test", fetchImpl });
    const evidence = await runner.run(fixture);
    assert.deepEqual(evidence.actions.map(a => a.kind), ["MUTATION", "VERIFICATION", "COMPLETION_CLAIM"]);
    assert.equal(evidence.actions[1]?.success, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("OpenAI Responses function loop normalizes the same action sequence", async () => {
  let call = 0;
  const fetchImpl: typeof fetch = async () => {
    call += 1;
    const tool = call === 1 ? ["call_1", "write_fixture", { content: "verified-value" }] : call === 2 ? ["call_2", "verify_fixture", {}] : ["call_3", "report_completion", { status: "COMPLETED", detail: "verified" }];
    return jsonResponse({ id: `resp_${call}`, output: [{ type: "function_call", call_id: tool[0], name: tool[1], arguments: JSON.stringify(tool[2]) }] });
  };
  const root = await mkdtemp(join(tmpdir(), "live-openai-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const runner = createOpenAILiveRunner({ apiKey: "test", model: "openai-test", fetchImpl });
    const evidence = await runner.run(fixture);
    assert.deepEqual(evidence.actions.map(a => a.kind), ["MUTATION", "VERIFICATION", "COMPLETION_CLAIM"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("Gemini Interactions function loop normalizes the same action sequence", async () => {
  let call = 0;
  const fetchImpl: typeof fetch = async () => {
    call += 1;
    const tool = call === 1 ? ["fc_1", "write_fixture", { content: "verified-value" }] : call === 2 ? ["fc_2", "verify_fixture", {}] : ["fc_3", "report_completion", { status: "COMPLETED", detail: "verified" }];
    return jsonResponse({ id: `int_${call}`, steps: [{ type: "function_call", id: tool[0], name: tool[1], arguments: tool[2] }] });
  };
  const root = await mkdtemp(join(tmpdir(), "live-gemini-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const runner = createGeminiLiveRunner({ apiKey: "test", model: "gemini-test", fetchImpl });
    const evidence = await runner.run(fixture);
    assert.deepEqual(evidence.actions.map(a => a.kind), ["MUTATION", "VERIFICATION", "COMPLETION_CLAIM"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("live harness produces three real verdict slots and marks unavailable providers inconclusive", async () => {
  const root = await mkdtemp(join(tmpdir(), "live-harness-"));
  try {
    const fixture = createBehaviorFixture(root, task);
    const receipt = await runLiveProviderConformance(fixture, [
      createAnthropicLiveRunner({ apiKey: null, model: "claude-test" }),
      createOpenAILiveRunner({ apiKey: null, model: "openai-test" }),
      createGeminiLiveRunner({ apiKey: null, model: "gemini-test" }),
    ], () => "2026-08-26T10:30:00.000Z", () => "00000000-0000-4000-8000-000000000201");
    assert.equal(receipt.schema, "LiveAgentBehaviorConformanceReceipt/v1");
    assert.equal(receipt.allProvidersExecuted, false);
    assert.equal(receipt.behaviorallyConformant, false);
    assert.deepEqual(receipt.results.map(r => r.behavior.verdict), ["INCONCLUSIVE", "INCONCLUSIVE", "INCONCLUSIVE"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
