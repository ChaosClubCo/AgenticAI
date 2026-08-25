import { createServer } from "node:http";
import { resolve } from "node:path";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { registerProvenanceTools } from "./server.js";
import type { ProvenanceOptions } from "./provenance-tools.js";
import { FilePromotionEventStore } from "../persistence/file-event-store.js";
import { FileRegistryCheckpointStore } from "../persistence/file-checkpoint-store.js";
import { FileMaterializationReceiptStore } from "../persistence/materialization-receipt-store.js";
import { GitCliObjectReader } from "../integrity/git-materialization-verifier.js";
import { PRODUCTION_AUTHORITY_POLICY } from "../authority/production-authority-policy.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("Invalid PORT.");

const dataDir = resolve(process.env.DURABLE_ASSETS_DATA_DIR ?? "./data/production");
const eventStore = new FilePromotionEventStore(resolve(dataDir, "events"));
const checkpointStore = new FileRegistryCheckpointStore(resolve(dataDir, "checkpoints"));
const receiptStore = new FileMaterializationReceiptStore(resolve(dataDir, "materialization-receipts"));
const gitRepoRoot = process.env.PROVENANCE_GIT_REPO_ROOT ? resolve(process.env.PROVENANCE_GIT_REPO_ROOT) : null;
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean));

const mcp = createMcpHandler(() => {
  const server = new McpServer({ name: "loxihart-durable-assets-provenance", version: "1.2.0" });
  const provenance: ProvenanceOptions = {
    listEvents: () => eventStore.list(),
    listCheckpoints: () => checkpointStore.list(),
    getAuthorityPolicy: async () => PRODUCTION_AUTHORITY_POLICY,
  };
  if (gitRepoRoot) {
    provenance.getMaterializationReceipt = async receiptId => (await receiptStore.list()).find(receipt => receipt.receiptId === receiptId) ?? null;
    provenance.gitReader = new GitCliObjectReader(gitRepoRoot);
  }
  registerProvenanceTools(server, provenance);
  return server;
});
const handleMcp = toNodeHandler(mcp, { onerror: error => console.error("MCP request failed", error) });

const http = createServer(async (req, res) => {
  const method = req.method;
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ status: "ok", mode: "read-only", mutationCredentials: false, signingCredentials: false }));
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
});

http.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "provenance_mcp_started", port, mode: "read-only", mutationCredentials: false, signingCredentials: false }));
});
