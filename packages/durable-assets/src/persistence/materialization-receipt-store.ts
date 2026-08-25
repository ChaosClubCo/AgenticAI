import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  MaterializationReceiptV1Schema,
  type MaterializationReceiptV1,
} from "../schemas/integrity.v1.js";

const ReceiptIdSchema = z.string().uuid();

export class DuplicateMaterializationReceiptError extends Error {
  constructor(public readonly receiptId: string) {
    super(`Materialization receipt already exists: ${receiptId}`);
    this.name = "DuplicateMaterializationReceiptError";
  }
}

export function createMaterializationReceipt(
  input: Omit<MaterializationReceiptV1, "schema">,
): MaterializationReceiptV1 {
  return MaterializationReceiptV1Schema.parse({
    schema: "MaterializationReceipt/v1",
    ...input,
  });
}

export class FileMaterializationReceiptStore {
  constructor(private readonly directory: string) {}

  async append(receipt: MaterializationReceiptV1): Promise<void> {
    const validated = MaterializationReceiptV1Schema.parse(receipt);
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, `${validated.receiptId}.json`);
    try {
      await writeFile(path, `${JSON.stringify(validated)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if (isAlreadyExists(error)) {
        throw new DuplicateMaterializationReceiptError(validated.receiptId);
      }
      throw error;
    }
  }

  async get(receiptId: string): Promise<MaterializationReceiptV1 | null> {
    const id = ReceiptIdSchema.parse(receiptId);
    try {
      const raw = await readFile(join(this.directory, `${id}.json`), "utf8");
      return MaterializationReceiptV1Schema.parse(JSON.parse(raw));
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async list(): Promise<MaterializationReceiptV1[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter((name) => name.endsWith(".json")).sort();
    const receipts = await Promise.all(names.map(async (name) => {
      const raw = await readFile(join(this.directory, name), "utf8");
      return MaterializationReceiptV1Schema.parse(JSON.parse(raw));
    }));
    return receipts.sort((a, b) => a.materializedAt.localeCompare(b.materializedAt) || a.receiptId.localeCompare(b.receiptId));
  }
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
