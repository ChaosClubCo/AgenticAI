import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { createDurableAssetsToolHandlers, type DurableAssetsToolHandlerOptions } from "./promotion-tools.js";
import { createProvenanceHandlers, type ProvenanceOptions } from "./provenance-tools.js";

const AssetTypeSchema = z.enum(["SKILL", "POLICY", "SOP", "SCHEMA", "CONTRACT", "TEST", "EVALUATION", "DOCUMENTATION"]);
const EvidenceSchema = z.object({ sessionId: z.string().min(1), occurrenceId: z.string().min(1), observedAt: z.string().min(1), contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), sourceRef: z.string().min(1).optional() });
const AuthorityInput = z.object({ assetId: z.string().min(3), patternId: z.string().min(3), assetType: AssetTypeSchema, version: z.string().regex(/^\d+\.\d+\.\d+$/), canonicalPath: z.string().min(1), description: z.string().min(1), semanticFingerprint: z.string().min(1), authorityRef: z.string().min(1), evidenceRefs: z.array(EvidenceSchema) });

export type DurableAssetsMcpServerOptions = DurableAssetsToolHandlerOptions & Partial<ProvenanceOptions>;
function jsonResult(value: unknown) { return { content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }

export function registerProvenanceTools(server: McpServer, options: ProvenanceOptions) {
  const handlers = createProvenanceHandlers(options);
  server.registerTool("durable_assets_get_asset_lineage", { description: "Read canonical asset lineage.", inputSchema: z.object({ assetId: z.string().min(3) }) }, async input => jsonResult(await handlers.getAssetLineage(input.assetId)));
  server.registerTool("durable_assets_get_active_registry", { description: "Read ACTIVE canonical assets and projection hash.", inputSchema: z.object({}) }, async () => jsonResult(await handlers.getActiveRegistry()));
  server.registerTool("durable_assets_get_projection_status", { description: "Read deterministic projection status.", inputSchema: z.object({}) }, async () => jsonResult(await handlers.getProjectionStatus()));
  server.registerTool("durable_assets_verify_checkpoint_chain", { description: "Verify checkpoint hash chain and signatures when trusted verification keys are configured.", inputSchema: z.object({}) }, async () => jsonResult(await handlers.verifyCheckpointChain()));
  if (options.listSignedCheckpoints && options.verifier) {
    server.registerTool("durable_assets_verify_checkpoint", { description: "Verify one persisted signed checkpoint against the trusted/revoked verification-key registry.", inputSchema: z.object({ checkpointId: z.string().uuid() }) }, async input => jsonResult(await handlers.verifyStoredCheckpoint(input.checkpointId)));
  }
  if (options.getAuthorityPolicy) server.registerTool("durable_assets_get_authority_policy", { description: "Read authority policy.", inputSchema: z.object({}) }, async () => jsonResult(await handlers.getAuthorityPolicy()));
  if (options.getMaterializationReceipt && options.gitReader) server.registerTool("durable_assets_verify_materialization_receipt", { description: "Verify receipt against exact Git commit:path bytes.", inputSchema: z.object({ receiptId: z.string().uuid() }) }, async input => jsonResult(await handlers.verifyMaterializationReceipt(input.receiptId)));
}

export function registerMutationTools(server: McpServer, options: DurableAssetsToolHandlerOptions) {
  const handlers = createDurableAssetsToolHandlers(options);
  server.registerTool("durable_assets_record_observation", { description: "Record one pattern observation.", inputSchema: z.object({ patternId: z.string().min(3), semanticFingerprint: z.string().min(1), evidence: EvidenceSchema, reusable: z.boolean(), temporaryContext: z.boolean(), proposedAssetType: AssetTypeSchema.nullable() }) }, async input => jsonResult(await handlers.recordObservation(input)));
  server.registerTool("durable_assets_merge_existing", { description: "Merge reviewed candidate into canonical asset.", inputSchema: z.object({ patternId: z.string().min(3), targetAssetId: z.string().min(3) }) }, async input => jsonResult(await handlers.mergeExisting(input)));
  server.registerTool("durable_assets_supersede_version", { description: "Create replacement version with fresh lifecycle.", inputSchema: z.object({ previousAssetId: z.string().min(3), assetId: z.string().min(3), version: z.string(), canonicalPath: z.string(), description: z.string(), semanticFingerprint: z.string(), evidenceRefs: z.array(EvidenceSchema) }) }, async input => jsonResult(await handlers.supersedeVersion(input)));
}

export function registerAuthorityTools(server: McpServer, options: DurableAssetsToolHandlerOptions) {
  if (!options.authorityKind || !options.authorityPolicy) return;
  const handlers = createDurableAssetsToolHandlers(options);
  server.registerTool("durable_assets_authorize_promotion", { description: `Apply policy-scoped ${options.authorityKind} authority. Identity and authority are host-controlled.`, inputSchema: AuthorityInput }, async input => jsonResult(await handlers.authorizePromotion(input)));
}

export function createDurableAssetsMcpServer(options: DurableAssetsMcpServerOptions): McpServer {
  const server = new McpServer({ name: "loxihart-durable-assets", version: "1.2.0" });
  registerProvenanceTools(server, options);
  registerMutationTools(server, options);
  registerAuthorityTools(server, options);
  return server;
}

export function serveDurableAssetsStdio(options: DurableAssetsMcpServerOptions) { return serveStdio(() => createDurableAssetsMcpServer(options)); }
