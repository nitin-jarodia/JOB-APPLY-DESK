import { dataFile, readJsonFile, writeJsonFile } from "../atomic-json";
import { jobsSnapshotSchema, type JobsSnapshot } from "./types";

const JOBS_FILE = dataFile("jobs.json");

/**
 * Returns the last successful fetch, or null when there is none yet. A cache
 * file that no longer parses is treated as absent rather than fatal, so a
 * schema change cannot wedge the jobs page.
 */
export async function readJobsSnapshot(): Promise<JobsSnapshot | null> {
  const raw = await readJsonFile(JOBS_FILE).catch(() => null);
  if (raw === null) return null;
  const parsed = jobsSnapshotSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function writeJobsSnapshot(snapshot: JobsSnapshot): Promise<JobsSnapshot> {
  await writeJsonFile(JOBS_FILE, snapshot);
  return snapshot;
}

export const JOBS_FILE_PATH = JOBS_FILE;
