import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import {
  createDurableAssetsToolHandlers,
  type DurableAssetsToolHandlerOptions,
} from "./promotion-tools.js";

const AssetTypeSchema = z.enum([
  "SKILL",
  "POLICY",
  "SOP",
  "SCHEMA",
  "CONTRACT",
  "TEST",
  "EVALUATION",
  "DOCUMENTATION",
]);

const EvidenceSchema = z.object({
  sessionId: z.string().min(1),
  occurrenceId: z.string().min(1),
  observedAt: z.string().min(1),
  contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceRef: z.string().min(1).optional(),
});

const AuthorityPromotionInputSchema = z.object({
  assetId: z.string().min(3),
  patternId: z.string().min(3),
  assetType: AssetTypeSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  canonicalPath: z.string().min(1),
  description: z.string().min(1),
  semanticFingerprint: z.string().min(1),
  authorityRef: z.string().min(1),
  evidenceRefs: z.array(EvidenceSchema),
});

export type DurableAssetsMcpServerOptions = DurableAssetsToolHandlerOptions;

export function createDurableAssetsMcpServer(options: DurableAssetsMcpServerOptions): McpServer {
  const server = new McpServer({ name: "loxihart-durable-assets", version: "1.1.0" });
  const handlers = createDurableAssetsToolHandlers(options);

  server.registerTool(
    "durable_assets_record_observation",
    {
      description: "Record one durable-asset pattern observation. This never bypasses promotion policy.",
      inputSchema: z.object({
        patternId: z.string().min(3),
        semanticFingerprint: z.string().min(1),
        evidence: EvidenceSchema,
        reusable: z.boolean(),
        temporaryContext: z.boolean(),
        proposedAssetType: AssetTypeSchema.nullable(),
      }),
    },
    async (input) => jsonResult(await handlers.recordObservation(input)),
  );

  server.registerTool(
    "durable_assets_project_registry",
    {
      description: "Replay immutable promotion events into the deterministic registry projection and return its SHA-256 hash.",
      inputSchema: z.object({}),
    },
    async () => jsonResult(await handlers.projectRegistry()),
  );

  server.registerTool(
    "durable_assets_merge_existing",
    {
      description: "Merge a reviewed candidate pattern into an existing canonical durable asset.",
      inputSchema: z.object({ patternId: z.string().min(3), targetAssetId: z.string().min(3) }),
    },
    async (input) => jsonResult(await handlers.mergeExisting(input)),
  );

  server.registerTool(
    "durable_assets_supersede_version",
    {
      description: "Create a new durable-asset version with fresh validation while retaining the predecessor until replacement activation.",
      inputSchema: z.object({
        previousAssetId: z.string().min(3),
        assetId: z.string().min(3),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        canonicalPath: z.string().min(1),
        description: z.string().min(1),
        semanticFingerprint: z.string().min(1),
        evidenceRefs: z.array(EvidenceSchema),
      }),
    },
    async (input) => jsonResult(await handlers.supersedeVersion(input)),
  );

  if (options.authorityKind) {
    server.registerTool(
      "durable_assets_authorize_promotion",
      {
        description: `Apply trusted ${options.authorityKind} promotion authority. Authority comes from server configuration, never tool input.`,
        inputSchema: AuthorityPromotionInputSchema,
      },
      async (input) => jsonResult(await handlers.authorizePromotion(input)),
    );
  }

  if (options.appendCheckpoint && options.listCheckpoints) {
    server.registerTool(
      "durable_assets_create_checkpoint",
      {
        description: "Persist a chained cryptographic checkpoint for the current registry projection.",
        inputSchema: z.object({}),
      },
      async () => jsonResult(await handlers.createCheckpoint()),
    );
  }

  return server;
}

export function serveDurableAssetsStdio(options: DurableAssetsMcpServerOptions) {
  return serveStdio(() => createDurableAssetsMcpServer(options));
}

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}
