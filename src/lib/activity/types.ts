import { z } from "zod";

/**
 * Where a job sits in the loop: found it, kept it, built a resume for it,
 * applied, or decided against it.
 *
 * Only two of these are ever set by an explicit click. `resume-ready` is set
 * when a tailored resume is built, and `applied` and `skipped` are set when he
 * presses those buttons. Opening the employer's link never changes anything,
 * because the app cannot see whether he actually applied.
 */
export const JOB_STATUSES = [
  "new",
  "saved",
  "resume-ready",
  "applied",
  "skipped",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const DEFAULT_JOB_STATUS: JobStatus = "new";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  new: "New",
  saved: "Saved",
  "resume-ready": "Resume ready",
  applied: "Applied",
  skipped: "Skipped",
};

export const jobActivitySchema = z.object({
  jobId: z.string(),
  slug: z.string(),
  /** Copied so applied history survives a posting leaving the feed. */
  title: z.string(),
  company: z.string(),
  applyUrl: z.string(),
  status: z.enum(JOB_STATUSES),
  updatedAt: z.string(),
  /** Only set while the status is `applied`. */
  appliedAt: z.string().nullable(),
});

export const activityFileSchema = z.object({
  version: z.number().int(),
  entries: z.record(z.string(), jobActivitySchema),
});

export type JobActivity = z.infer<typeof jobActivitySchema>;
export type ActivityFile = z.infer<typeof activityFileSchema>;
export type ActivityMap = Record<string, JobActivity>;

export const ACTIVITY_FILE_VERSION = 1;

export function statusOf(activity: ActivityMap, jobId: string): JobStatus {
  return activity[jobId]?.status ?? DEFAULT_JOB_STATUS;
}
