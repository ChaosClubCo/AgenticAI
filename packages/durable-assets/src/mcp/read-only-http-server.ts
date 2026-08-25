import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { registerProvenanceTools } from "./server.js";
import type { ProvenanceOptions } from "./provenance-tools.js";
import { FilePromotionEventStore } from "../persistence/file-event-store.js";
import { FileRegistryCheckpointStore } from "../persistence/file-checkpoint-store.js";
import { FileMaterializationReceiptStore } from "../persistence/materialization-receipt-store.js";
import { FileAttestationStore } from "../persistence/file-attestation-store.js";
import { GitCliObjectReader } from "../integrity/git-materialization-verifier.js";
import { createRegistryCheckpointVerifier, createVerificationKeyRegistry, VerificationKeyRegistryV1Schema } from "../integrity/verification-key-registry.js";
import { SignedRegistryCheckpointV1Schema } from "../schemas/trust.v1.js";
import { PRODUCTION_AUTHORITY_POLICY } from "../authority/production-authority-policy.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("Invalid PORT.");

const dataDir = resolve(process.env.DURABLE_ASSETS_DATA_DIR ?? "./data/production");
const eventStore = new FilePromotionEventStore(resolve(dataDir, "events"));
const checkpointStore = new FileRegistryCheckpointStore(resolve(dataDir, "checkpoints"));
const receiptStore = new FileMaterializationReceiptStore(resolve(dataDir, "materialization-receipts"));
const attestationStore = new FileAttestationStore(resolve(dataDir, "attestations"));
const gitRepoRoot = process.env.PROVENANCE_GIT_REPO_ROOT ? resolve(process.env.PROVENANCE_GIT_REPO_ROOT) : null;
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean));
const verificationRegistry = await loadVerificationRegistry();
const verifier = createRegistryCheckpointVerifier(verificationRegistry);

async function loadVerificationRegistry() {
  const configuredPath = process.env.VERIFICATION_KEY_REGISTRY_PATH;
  if (!configuredPath) {
    return createVerificationKeyRegistry({
      registryId: "production-keys",
      revision: 1,
      createdAt: "2026-08-25T18:00:00.000Z",
      keys: [],
    });
  }
  const parsed = VerificationKeyRegistryV1Schema.parse(JSON.parse(await readFile(resolve(configuredPath), "utf8")));
  createRegistryCheckpointVerifier(parsed);
  return parsed;
}

const mcp = createMcpHandler(() => {
  const server = new McpServer({ name: "loxihart-durable-assets-provenance", version: "1.2.0" });
  const provenance: ProvenanceOptions = {
    listEvents: () => eventStore.list(),
    listCheckpoints: () => checkpointStore.list(),
    listSignedCheckpoints: async () => (await attestationStore.list())
      .filter(artifact => artifact.kind === "SIGNED_CHECKPOINT")
      .map(artifact => SignedRegistryCheckpointV1Schema.parse(artifact.payload)),
    verifier,
    getAuthorityPolicy: async () => PRODUCTION_AUTHORITY_POLICY,
  };
  if (gitRepoRoot) {
    provenance.getMaterializationReceipt = receiptId => receiptStore.get(receiptId);
    provenance.gitReader = new GitCliObjectReader(gitRepoRoot);
  }
  registerProvenanceTools(server, provenance);
  return server;
});
const handleMcp = toNodeHandler(mcp, { onerror: error => console.error("MCP request failed", error) });

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method;
  let url: URL;
  try {
    url = new URL(req.url ?? "/", "http://localhost");
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "invalid_url" }));
    return;
  }
  if (method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({
      status: "ok",
      mode: "read-only",
      mutationCredentials: false,
      signingCredentials: false,
      verificationKeyRegistryRevision: verificationRegistry.revision,
      trustedVerificationKeys: verificationRegistry.keys.filter(key => key.status === "TRUSTED").length,
      revokedVerificationKeys: verificationRegistry.keys.filter(key => key.status === "REVOKED").length,
    }));
    return;
  }
  if (url.pathname !== "/mcp") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  if (!method) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "missing_method" }));
    return;
  }
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    res.writeHead(403, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "origin_not_allowed" }));
    return;
  }
  await handleMcp(req as Parameters<typeof handleMcp>[0], res);
}

const http = createServer((req, res) => {
  void handleRequest(req, res).catch(error => {
    console.error("HTTP request failed", error);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    if (!res.writableEnded) res.end(JSON.stringify({ error: "internal_error" }));
  });
});

http.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({
    event: "provenance_mcp_started",
    port,
    mode: "read-only",
    mutationCredentials: false,
    signingCredentials: false,
    verificationKeyRegistryRevision: verificationRegistry.revision,
  }));
});
