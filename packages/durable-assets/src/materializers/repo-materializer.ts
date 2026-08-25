import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { sha256Text } from "../integrity/canonical-hash.js";
import type { DurableAssetRegistryEntryV1 } from "../schemas/registry.v1.js";

export type MaterializationRoot = ".skills" | "policies" | "schemas" | "tests" | "docs";

export interface MaterializedAsset {
  assetId: string;
  relativePath: string;
  root: MaterializationRoot;
  assetHash: `sha256:${string}`;
}

export async function materializeAsset(
  repoRoot: string,
  asset: DurableAssetRegistryEntryV1,
  body: string,
): Promise<MaterializedAsset> {
  if (asset.lifecycle !== "VERIFIED" && asset.lifecycle !== "ACTIVE") {
    throw new Error(`Cannot materialize ${asset.assetId} from lifecycle ${asset.lifecycle}.`);
  }

  const root = rootForAsset(asset.type);
  const relativePath = canonicalRelativePath(asset, root);
  const absoluteRepoRoot = resolve(repoRoot);
  const absoluteTarget = resolve(absoluteRepoRoot, relativePath);
  assertWithinRoot(absoluteRepoRoot, absoluteTarget);

  await mkdir(dirname(absoluteTarget), { recursive: true });
  const content = renderArtifact(asset, body);
  await writeFile(absoluteTarget, content, { encoding: "utf8", flag: "w", mode: 0o600 });

  return { assetId: asset.assetId, relativePath, root, assetHash: sha256Text(content) };
}

export function rootForAsset(type: DurableAssetRegistryEntryV1["type"]): MaterializationRoot {
  switch (type) {
    case "SKILL": return ".skills";
    case "POLICY": return "policies";
    case "SCHEMA":
    case "CONTRACT": return "schemas";
    case "TEST":
    case "EVALUATION": return "tests";
    case "SOP":
    case "DOCUMENTATION": return "docs";
  }
}

function canonicalRelativePath(asset: DurableAssetRegistryEntryV1, root: MaterializationRoot): string {
  const requested = normalize(asset.canonicalPath).replace(/^[/\\]+/, "");
  const expectedPrefix = `${root}/`;
  const normalized = requested.replaceAll("\\", "/");
  if (!normalized.startsWith(expectedPrefix)) {
    throw new Error(`Canonical path for ${asset.assetId} must be under ${root}/.`);
  }
  if (normalized.includes("../")) throw new Error(`Canonical path traversal rejected for ${asset.assetId}.`);
  return normalized;
}

function renderArtifact(asset: DurableAssetRegistryEntryV1, body: string): string {
  const metadata = [
    `asset-id: ${asset.assetId}`,
    `asset-type: ${asset.type}`,
    `version: ${asset.version}`,
    `lifecycle: ${asset.lifecycle}`,
    `pattern-id: ${asset.patternId}`,
  ].join("\n");

  if (asset.type === "SKILL") return `---\n${metadata}\n---\n\n${body.trim()}\n`;
  return `<!--\n${metadata}\n-->\n\n${body.trim()}\n`;
}

function assertWithinRoot(repoRoot: string, target: string): void {
  const rel = relative(repoRoot, target);
  if (rel.startsWith("..") || rel === "" || join(repoRoot, rel) !== target) {
    throw new Error("Materialization target escapes repository root or resolves to the root itself.");
  }
}
