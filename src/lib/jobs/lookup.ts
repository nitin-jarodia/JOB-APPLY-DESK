import { readProfileRecord } from "@/lib/profile-store";
import type { ProfileRecord } from "@/lib/profile-schema";
import { scoreJobs } from "@/lib/scoring/scored-jobs";
import type { ScoredJob } from "@/lib/scoring/types";

import { readJobsSnapshot } from "./store";

/**
 * Resolves a detail-page slug to a scored job. Shared by the page and the
 * tailoring API so both agree on what a slug points at.
 */
export async function findScoredJobBySlug(
  slug: string,
): Promise<{ job: ScoredJob; profileRecord: ProfileRecord } | null> {
  const snapshot = await readJobsSnapshot();
  if (!snapshot) return null;
  const profileRecord = await readProfileRecord();
  const job = scoreJobs(snapshot.jobs, profileRecord.profile).find(
    (candidate) => candidate.slug === slug,
  );
  return job ? { job, profileRecord } : null;
}
