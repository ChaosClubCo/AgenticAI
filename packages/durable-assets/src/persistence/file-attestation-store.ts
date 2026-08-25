import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { IsoDateTimeSchema, Sha256Schema } from "../schemas/common.v1.js";

export const AttestationArtifactV1Schema = z.object({
  schema: z.literal("AttestationArtifact/v1"),
  artifactId: z.string().uuid(),
  kind: z.enum(["SIGNED_CHECKPOINT", "SIGNED_SNAPSHOT", "MATERIALIZATION_VERIFICATION", "ATTESTATION_RECEIPT"]),
  payloadHash: Sha256Schema,
  payload: z.unknown(),
  persistedAt: IsoDateTimeSchema,
}).strict();

export type AttestationArtifactV1 = z.infer<typeof AttestationArtifactV1Schema>;

export class FileAttestationStore {
  constructor(private readonly directory: string) {}

  async append(record: AttestationArtifactV1): Promise<void> {
    const parsed = AttestationArtifactV1Schema.parse(record);
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, `${parsed.artifactId}.json`);
    try {
      await writeFile(path, `${JSON.stringify(parsed)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
        throw new Error(`Attestation artifact already exists: ${parsed.artifactId}`);
      }
      throw error;
    }
  }

  async list(): Promise<AttestationArtifactV1[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter(name => name.endsWith(".json")).sort();
    const records = await Promise.all(names.map(async name => AttestationArtifactV1Schema.parse(JSON.parse(await readFile(join(this.directory, name), "utf8")))));
    return records.sort((a, b) => a.persistedAt.localeCompare(b.persistedAt) || a.artifactId.localeCompare(b.artifactId));
  }
}
