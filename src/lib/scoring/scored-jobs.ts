import type { JobsSnapshot, NormalizedJob } from "@/lib/jobs/types";
import type { Profile } from "@/lib/profile-schema";

import { extractResumeSkills } from "./resume-skills";
import { scoreJob } from "./score";
import { jobSlug } from "./slug";
import type { ScoredJob, ScoredSnapshot } from "./types";

/** Highest score first, then the newer posting, then a stable title order. */
export function byScore(a: ScoredJob, b: ScoredJob): number {
  if (b.scoring.score !== a.scoring.score) return b.scoring.score - a.scoring.score;
  const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  if (bTime !== aTime) return bTime - aTime;
  return a.title.localeCompare(b.title);
}

export function scoreJobs(jobs: NormalizedJob[], profile: Profile): ScoredJob[] {
  // The resume is read once and reused, so every job is measured against the
  // same snapshot of what he actually knows.
  const resume = extractResumeSkills(profile);
  return jobs
    .map((job) => ({
      ...job,
      slug: jobSlug(job),
      scoring: scoreJob(job, resume, profile),
    }))
    .sort(byScore);
}

export function scoreSnapshot(snapshot: JobsSnapshot, profile: Profile): ScoredSnapshot {
  return { ...snapshot, jobs: scoreJobs(snapshot.jobs, profile) };
}
