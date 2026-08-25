import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PromotionEventV1Schema, type PromotionEventV1 } from "../schemas/promotion-event.v1.js";

export class DuplicateEventError extends Error {
  constructor(public readonly eventId: string) {
    super(`Promotion event already exists: ${eventId}`);
    this.name = "DuplicateEventError";
  }
}

export class FilePromotionEventStore {
  constructor(private readonly directory: string) {}

  async append(event: PromotionEventV1): Promise<void> {
    const validated = PromotionEventV1Schema.parse(event);
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(validated.eventId);

    try {
      await writeFile(path, `${JSON.stringify(validated)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    } catch (error) {
      if (isAlreadyExists(error)) throw new DuplicateEventError(validated.eventId);
      throw error;
    }
  }

  async list(): Promise<PromotionEventV1[]> {
    await mkdir(this.directory, { recursive: true });
    const names = (await readdir(this.directory))
      .filter((name) => name.endsWith(".json"))
      .sort();

    const events = await Promise.all(names.map(async (name) => {
      const raw = await readFile(join(this.directory, name), "utf8");
      return PromotionEventV1Schema.parse(JSON.parse(raw));
    }));

    return events.sort((a, b) => {
      const time = a.occurredAt.localeCompare(b.occurredAt);
      return time !== 0 ? time : a.eventId.localeCompare(b.eventId);
    });
  }

  private pathFor(eventId: string): string {
    return join(this.directory, `${eventId}.json`);
  }
}

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
