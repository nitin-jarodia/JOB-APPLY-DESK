import { dataFile, readJsonFile, writeJsonFile } from "@/lib/atomic-json";

import {
  TAILORED_FILE_VERSION,
  tailoredFileSchema,
  type TailoredFile,
  type TailoredRecord,
} from "./types";

const TAILORED_FILE = dataFile("tailored.json");

const EMPTY: TailoredFile = { version: TAILORED_FILE_VERSION, entries: {} };

/**
 * A file that no longer parses is treated as empty rather than fatal. The
 * tailored resume is always reproducible from the master resume, so starting
 * over costs nothing.
 */
async function readFile(): Promise<TailoredFile> {
  const raw = await readJsonFile(TAILORED_FILE).catch(() => null);
  if (raw === null) return { ...EMPTY };
  const parsed = tailoredFileSchema.safeParse(raw);
  return parsed.success ? parsed.data : { ...EMPTY };
}

export async function readTailored(jobId: string): Promise<TailoredRecord | null> {
  const file = await readFile();
  return file.entries[jobId] ?? null;
}

export async function writeTailored(record: TailoredRecord): Promise<TailoredRecord> {
  const file = await readFile();
  file.version = TAILORED_FILE_VERSION;
  file.entries[record.jobId] = record;
  await writeJsonFile(TAILORED_FILE, file);
  return record;
}

export const TAILORED_FILE_PATH = TAILORED_FILE;
