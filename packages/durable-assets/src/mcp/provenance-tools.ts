import { randomUUID } from "node:crypto";
import type { AuthorityPolicyV1, SignedRegistryCheckpointV1 } from "../schemas/trust.v1.js";
import type { MaterializationReceiptV1, RegistryCheckpointV1 } from "../schemas/integrity.v1.js";
import type { PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import type { CheckpointVerifier } from "../integrity/checkpoint-signing.js";
import { verifySignedRegistryCheckpoint } from "../integrity/checkpoint-signing.js";
import { verifyRegistryCheckpointChain } from "../projection/registry-checkpoint.js";
import { projectRegistry } from "../projection/registry-projection.js";
import { verifyMaterializationReceipt, type GitObjectReader } from "../integrity/git-materialization-verifier.js";

export interface ProvenanceOptions {
  listEvents: () => Promise<PromotionEventV1[]>;
  listCheckpoints?: () => Promise<RegistryCheckpointV1[]>;
  listSignedCheckpoints?: () => Promise<SignedRegistryCheckpointV1[]>;
  verifier?: CheckpointVerifier;
  getAuthorityPolicy?: () => Promise<AuthorityPolicyV1>;
  getMaterializationReceipt?: (receiptId: string) => Promise<MaterializationReceiptV1 | null>;
  gitReader?: GitObjectReader;
  now?: () => string;
  uuid?: () => string;
}

export function createProvenanceHandlers(options: ProvenanceOptions) {
  return {
    getActiveRegistry: async () => {
      const projection = projectRegistry(await options.listEvents());
      return { projectionHash: projection.projectionHash, assets: Object.values(projection.registry.assets).filter(asset => asset.lifecycle === "ACTIVE") };
    },
    getProjectionStatus: async () => {
      const projection = projectRegistry(await options.listEvents());
      return { projectionHash: projection.projectionHash, revision: projection.registry.revision, eventCount: projection.eventCount, lastEventId: projection.lastEventId };
    },
    getAssetLineage: async (assetId: string) => {
      const projection = projectRegistry(await options.listEvents());
      const asset = projection.registry.assets[assetId];
      if (!asset) throw new Error(`Unknown asset: ${assetId}`);
      const seen = new Set<string>();
      const chain: unknown[] = [];
      let current: typeof asset | undefined = asset;
      while (current) {
        if (seen.has(current.assetId)) throw new Error("Asset lineage cycle detected.");
        seen.add(current.assetId);
        chain.push(current);
        const previousId: string | undefined = current.supersedes[0];
        current = previousId ? projection.registry.assets[previousId] : undefined;
      }
      return { asset, chain };
    },
    verifyCheckpointChain: async () => {
      if (options.listSignedCheckpoints && options.verifier) {
        const signed = (await options.listSignedCheckpoints()).sort((a, b) => a.checkpoint.createdAt.localeCompare(b.checkpoint.createdAt) || a.checkpoint.checkpointId.localeCompare(b.checkpoint.checkpointId));
        const checkpoints = signed.map(item => item.checkpoint);
        if (!verifyRegistryCheckpointChain(checkpoints)) return { valid: false, reason: "HASH_CHAIN_INVALID" as const };
        for (const item of signed) {
          const verdict = await verifySignedRegistryCheckpoint(item, options.verifier);
          if (verdict !== "TRUSTED") return { valid: false, reason: verdict, checkpointId: item.checkpoint.checkpointId };
        }
        return { valid: true, signed: true, count: signed.length };
      }
      return { valid: verifyRegistryCheckpointChain(await options.listCheckpoints?.() ?? []), signed: false };
    },
    verifyStoredCheckpoint: async (checkpointId: string) => {
      if (!options.listSignedCheckpoints || !options.verifier) throw new Error("Signed checkpoint verification is not configured.");
      const signed = (await options.listSignedCheckpoints()).find(item => item.checkpoint.checkpointId === checkpointId);
      if (!signed) throw new Error(`Unknown signed checkpoint: ${checkpointId}`);
      return { checkpointId, verdict: await verifySignedRegistryCheckpoint(signed, options.verifier) };
    },
    verifyMaterializationReceipt: async (receiptId: string) => {
      if (!options.getMaterializationReceipt || !options.gitReader) throw new Error("Git materialization verification not configured.");
      const receipt = await options.getMaterializationReceipt(receiptId);
      if (!receipt) throw new Error(`Unknown receipt: ${receiptId}`);
      return verifyMaterializationReceipt(receipt, options.gitReader, options.uuid?.() ?? randomUUID(), options.now?.() ?? new Date().toISOString());
    },
    getAuthorityPolicy: async () => {
      if (!options.getAuthorityPolicy) throw new Error("Authority policy not configured.");
      return options.getAuthorityPolicy();
    },
  };
}
