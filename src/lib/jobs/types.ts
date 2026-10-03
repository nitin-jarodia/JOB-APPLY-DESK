import { z } from "zod";

export const SOURCE_NAMES = [
  "himalayas",
  "remotive",
  "greenhouse",
  "lever",
  "ashby",
] as const;

export type SourceName = (typeof SOURCE_NAMES)[number];

export const LOCATION_FITS = ["india", "remote-india", "worldwide-remote"] as const;
export type LocationFit = (typeof LOCATION_FITS)[number];

export const normalizedJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  isRemote: z.boolean(),
  description: z.string(),
  applyUrl: z.string(),
  source: z.enum(SOURCE_NAMES),
  sourceLabel: z.string(),
  publishedAt: z.string().nullable(),
  locationFit: z.enum(LOCATION_FITS),
});

export const sourceResultSchema = z.object({
  source: z.enum(SOURCE_NAMES),
  label: z.string(),
  ok: z.boolean(),
  /** Set when this source's result was reused from cache instead of refetched. */
  fromCache: z.boolean(),
  error: z.string().nullable(),
  fetched: z.number(),
  kept: z.number(),
  requests: z.number(),
  failedEndpoints: z.array(z.object({ endpoint: z.string(), reason: z.string() })),
  durationMs: z.number(),
});

export const jobsSnapshotSchema = z.object({
  version: z.number().int(),
  fetchedAt: z.string(),
  jobs: z.array(normalizedJobSchema),
  sources: z.array(sourceResultSchema),
});

export type NormalizedJob = z.infer<typeof normalizedJobSchema>;
export type SourceResult = z.infer<typeof sourceResultSchema>;
export type JobsSnapshot = z.infer<typeof jobsSnapshotSchema>;

export const JOBS_SNAPSHOT_VERSION = 1;

export const SOURCE_LABELS: Record<SourceName, string> = {
  himalayas: "Himalayas",
  remotive: "Remotive",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
};
