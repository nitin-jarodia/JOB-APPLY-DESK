import { dataFile, readJsonFile, writeJsonFile } from "@/lib/atomic-json";

import {
  ACTIVITY_FILE_VERSION,
  activityFileSchema,
  type ActivityFile,
  type ActivityMap,
  type JobActivity,
  type JobStatus,
} from "./types";

const ACTIVITY_FILE = dataFile("job-status.json");

async function readFile(): Promise<ActivityFile> {
  const raw = await readJsonFile(ACTIVITY_FILE);
  if (raw === null) return { version: ACTIVITY_FILE_VERSION, entries: {} };
  const parsed = activityFileSchema.safeParse(raw);
  if (!parsed.success) {
    // Unlike a tailored resume, applied history cannot be rebuilt from
    // anything else, so a damaged file is reported rather than silently
    // replaced with an empty one.
    throw new Error(
      `${ACTIVITY_FILE} is not a valid status file. Fix or delete it; deleting loses which jobs you marked.`,
    );
  }
  return parsed.data;
}

export async function readActivity(): Promise<ActivityMap> {
  return (await readFile()).entries;
}

type JobRef = { id: string; slug: string; title: string; company: string; applyUrl: string };

async function save(entry: JobActivity): Promise<JobActivity> {
  const file = await readFile();
  file.version = ACTIVITY_FILE_VERSION;
  file.entries[entry.jobId] = entry;
  await writeJsonFile(ACTIVITY_FILE, file);
  return entry;
}

export async function setJobStatus(job: JobRef, status: JobStatus): Promise<JobActivity> {
  const now = new Date().toISOString();
  return save({
    jobId: job.id,
    slug: job.slug,
    title: job.title,
    company: job.company,
    applyUrl: job.applyUrl,
    status,
    updatedAt: now,
    // The applied timestamp only means something while the status is applied,
    // so moving away from applied clears it rather than leaving a stale date.
    appliedAt: status === "applied" ? now : null,
  });
}

/**
 * Promotes a job to `resume-ready` when its tailored resume is built. A job he
 * has already applied to or skipped is left alone, so generating a resume
 * cannot walk his own decision backwards.
 *
 * `changed` lets the caller tell the page to re-render, so the status badge
 * does not sit on a stale value until the next manual reload.
 */
export async function markResumeReady(
  job: JobRef,
): Promise<{ entry: JobActivity; changed: boolean }> {
  const file = await readFile();
  const current = file.entries[job.id];
  if (current && current.status !== "new" && current.status !== "saved") {
    return { entry: current, changed: false };
  }
  return { entry: await setJobStatus(job, "resume-ready"), changed: true };
}

export const ACTIVITY_FILE_PATH = ACTIVITY_FILE;
