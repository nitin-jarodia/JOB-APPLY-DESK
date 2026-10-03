import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}

/**
 * Writes go through a temp file so a crash mid-write cannot leave a truncated
 * file behind, and through this promise chain so concurrent requests cannot
 * interleave.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

export function writeJsonFile(file: string, value: unknown): Promise<void> {
  const task = async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const temp = path.join(DATA_DIR, `.${path.basename(file)}.${randomUUID()}.tmp`);
    try {
      await writeFile(temp, JSON.stringify(value, null, 2), "utf8");
      await rename(temp, file);
    } catch (error) {
      // A successful rename consumes the temp file. Any other outcome would
      // leave it behind and slowly litter the data folder.
      await rm(temp, { force: true }).catch(() => undefined);
      throw error;
    }
  };
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

/** Returns null when the file does not exist yet. */
export async function readJsonFile(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
