import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AgentBehaviorConformanceReceiptV1Schema,
  LiveAgentBehaviorConformanceReceiptV1Schema,
  type AgentBehaviorConformanceReceiptV1,
  type LiveAgentBehaviorConformanceReceiptV1,
} from "../behavior/contracts.v1.js";

export class FileBehaviorConformanceReceiptStore {
  constructor(private readonly directory: string) {}

  async append(receipt: AgentBehaviorConformanceReceiptV1): Promise<void> {
    const parsed = AgentBehaviorConformanceReceiptV1Schema.parse(receipt);
    await appendImmutable(this.directory, parsed.receiptId, parsed, "Behavior conformance receipt");
  }

  async list(): Promise<AgentBehaviorConformanceReceiptV1[]> {
    return listParsed(this.directory, AgentBehaviorConformanceReceiptV1Schema.parse);
  }
}

export class FileLiveBehaviorConformanceReceiptStore {
  constructor(private readonly directory: string) {}

  async append(receipt: LiveAgentBehaviorConformanceReceiptV1): Promise<void> {
    const parsed = LiveAgentBehaviorConformanceReceiptV1Schema.parse(receipt);
    await appendImmutable(this.directory, parsed.receiptId, parsed, "Live behavior conformance receipt");
  }

  async list(): Promise<LiveAgentBehaviorConformanceReceiptV1[]> {
    return listParsed(this.directory, LiveAgentBehaviorConformanceReceiptV1Schema.parse);
  }
}

async function appendImmutable(directory: string, id: string, payload: unknown, label: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(join(directory, `${id}.json`), `${JSON.stringify(payload)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
      throw new Error(`${label} already exists: ${id}`);
    }
    throw error;
  }
}

async function listParsed<T>(directory: string, parse: (value: unknown) => T): Promise<T[]> {
  await mkdir(directory, { recursive: true });
  const names = (await readdir(directory)).filter(name => name.endsWith(".json")).sort();
  return Promise.all(names.map(async name => {
    const raw = await readFile(join(directory, name), "utf8");
    return parse(JSON.parse(raw));
  }));
}
