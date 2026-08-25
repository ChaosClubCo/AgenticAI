import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { sha256Text } from "../integrity/canonical-hash.js";
import type { DurableAssetRegistryV1 } from "../schemas/registry.v1.js";

export interface SkillRegistryMaterialization {
  relativePath: ".skills/registry.yaml";
  contentHash: `sha256:${string}`;
}

export async function materializeSkillRegistryProjection(
  repoRoot: string,
  registry: DurableAssetRegistryV1,
  projectionHash: string,
): Promise<SkillRegistryMaterialization> {
  const relativePath = ".skills/registry.yaml" as const;
  const target = join(repoRoot, relativePath);
  const content = renderSkillRegistryProjection(registry, projectionHash);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, { encoding: "utf8", flag: "w", mode: 0o600 });
  return { relativePath, contentHash: sha256Text(content) };
}

export async function verifySkillRegistryProjection(
  repoRoot: string,
  registry: DurableAssetRegistryV1,
  projectionHash: string,
): Promise<boolean> {
  const expected = renderSkillRegistryProjection(registry, projectionHash);
  try {
    const actual = await readFile(join(repoRoot, ".skills/registry.yaml"), "utf8");
    return sha256Text(actual) === sha256Text(expected);
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export function renderSkillRegistryProjection(
  registry: DurableAssetRegistryV1,
  projectionHash: string,
): string {
  const skills = Object.values(registry.assets)
    .filter((asset) => asset.type === "SKILL" && asset.lifecycle === "ACTIVE")
    .sort((a, b) => a.assetId.localeCompare(b.assetId));

  const lines = [
    "# GENERATED FILE - DO NOT EDIT",
    "# Source: DurableAssetRegistry/v1 projection",
    "schema: DurableSkillRegistryProjection/v1",
    `projectionHash: ${yamlString(projectionHash)}`,
    `registryRevision: ${registry.revision}`,
    "skills:",
  ];

  if (skills.length === 0) lines.push("  []");
  for (const skill of skills) {
    lines.push(`  - assetId: ${yamlString(skill.assetId)}`);
    lines.push(`    version: ${yamlString(skill.version)}`);
    lines.push(`    lifecycle: ${yamlString(skill.lifecycle)}`);
    lines.push(`    canonicalPath: ${yamlString(skill.canonicalPath)}`);
    lines.push(`    patternId: ${yamlString(skill.patternId)}`);
  }

  return `${lines.join("\n")}\n`;
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
