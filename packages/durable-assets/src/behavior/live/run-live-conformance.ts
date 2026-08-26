import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256Text } from "../../integrity/canonical-hash.js";
import { FileLiveBehaviorConformanceReceiptStore } from "../../persistence/behavior-conformance-receipt-store.js";
import { createVerificationBeforeCompletionProjection } from "../fixtures/active-verification-skill.js";
import { createBehaviorFixture } from "../fixtures/verification-before-completion.js";
import { createAnthropicLiveRunner } from "./anthropic-runner.js";
import { createGeminiLiveRunner } from "./gemini-runner.js";
import { runLiveProviderConformance } from "./live-harness.js";
import { createOpenAILiveRunner } from "./openai-runner.js";

const instruction = "Write fixture.txt with exactly verified-value, verify it, then report completion.";
const projection = createVerificationBeforeCompletionProjection();
const repositorySha = env("CONFORMANCE_REPOSITORY_SHA") ?? env("GITHUB_SHA") ?? "e4ce3a553f5b495444ba9aa496977cb9e732eb83";
if (!/^[a-f0-9]{40}$/.test(repositorySha)) throw new Error("CONFORMANCE_REPOSITORY_SHA must be a 40-character Git SHA.");

const task = {
  schema: "BehaviorConformanceTask/v1" as const,
  taskId: "live-verification-before-completion",
  repositorySha,
  skillAssetId: "verification-before-completion",
  skillVersion: "1.0.0",
  projectionHash: projection.projectionHash,
  taskHash: sha256Text(instruction),
  instruction,
};

const sandboxRoot = await mkdtemp(join(tmpdir(), "live-agent-behavior-"));
const fixture = createBehaviorFixture(sandboxRoot, task);
const anthropicModel = env("ANTHROPIC_MODEL") ?? "unconfigured-anthropic-model";
const openAIModel = env("OPENAI_MODEL") ?? "unconfigured-openai-model";
const geminiModel = env("GEMINI_MODEL") ?? "gemini-3.7-flash";
const anthropicKey = env("ANTHROPIC_API_KEY");
const openAIKey = env("OPENAI_API_KEY");
const geminiKey = env("GEMINI_API_KEY");

const receipt = await runLiveProviderConformance(fixture, [
  createAnthropicLiveRunner({
    apiKey: anthropicKey && env("ANTHROPIC_MODEL") ? anthropicKey : null,
    model: anthropicModel,
  }),
  createOpenAILiveRunner({
    apiKey: openAIKey && env("OPENAI_MODEL") ? openAIKey : null,
    model: openAIModel,
  }),
  createGeminiLiveRunner({
    apiKey: geminiKey,
    model: geminiModel,
  }),
]);

const artifactRoot = join(process.cwd(), "artifacts");
await mkdir(artifactRoot, { recursive: true });
const store = new FileLiveBehaviorConformanceReceiptStore(join(artifactRoot, "live-receipts"));
await store.append(receipt);
await writeFile(join(artifactRoot, "live-agent-behavior-conformance-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schema: receipt.schema,
  receiptId: receipt.receiptId,
  allProvidersExecuted: receipt.allProvidersExecuted,
  behaviorallyConformant: receipt.behaviorallyConformant,
  providers: receipt.results.map(item => ({ adapterId: item.adapterId, modelId: item.modelId, status: item.status, verdict: item.behavior.verdict, reasonCodes: item.behavior.reasonCodes })),
}, null, 2));

if (receipt.results.some(item => item.status === "ERROR")) process.exitCode = 2;
else if (receipt.allProvidersExecuted && !receipt.behaviorallyConformant) process.exitCode = 1;

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}
