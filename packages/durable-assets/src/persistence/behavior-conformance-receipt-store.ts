import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AgentBehaviorConformanceReceiptV1Schema,
  type AgentBehaviorConformanceReceiptV1,
} from "../behavior/contracts.v1.js";

export class FileBehaviorConformanceReceiptStore {
  constructor(private readonly directory: string) {}

  async append(receipt: AgentBehaviorConformanceReceiptV1): Promise<void> {
    const parsed = AgentBehaviorConformanceReceiptV1Schema.parse(receipt);
    await mkdir(this.directory, { recursive: true });
    try {
      await writeFile(join(this.directory, `${parsed.receiptId}.json`), `${JSON.stringify(parsed)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
        throw new Error(`Behavior conformance receipt already exists: ${parsed.receiptId}`);
      }
      throw error;
    }
  }

  async list(): Promise<AgentBehaviorConformanceReceiptV1[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory)).filter(name => name.endsWith(".json")).sort();
    return Promise.all(names.map(async name => {
      const raw = await readFile(join(this.directory, name), "utf8");
      return AgentBehaviorConformanceReceiptV1Schema.parse(JSON.parse(raw));
    }));
  }
}
