import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  RegistryCheckpointV1Schema,
  type RegistryCheckpointV1,
} from "../schemas/integrity.v1.js";

export class DuplicateCheckpointError extends Error {
  constructor(public readonly checkpointId: string) {
    super(`Registry checkpoint already exists: ${checkpointId}`);
    this.name = "DuplicateCheckpointError";
  }
}

export class FileRegistryCheckpointStore {
  constructor(private readonly directory: string) {}

  async append(checkpoint: RegistryCheckpointV1): Promise<void> {
    const validated = RegistryCheckpointV1Schema.parse(checkpoint);
    await mkdir(this.directory, { recursive: true });
    try {
      await writeFile(join(this.directory, `${validated.checkpointId}.json`), `${JSON.stringify(validated)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if (isAlreadyExists(error)) throw new DuplicateCheckpointError(validated.checkpointId);
      throw error;
    }
  }

  async list(): Promise<RegistryCheckpointV1[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter((name) => name.endsWith(".json")).sort();
    const checkpoints = await Promise.all(names.map(async (name) => {
      const raw = await readFile(join(this.directory, name), "utf8");
      return RegistryCheckpointV1Schema.parse(JSON.parse(raw));
    }));
    return checkpoints.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.checkpointId.localeCompare(b.checkpointId));
  }
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
