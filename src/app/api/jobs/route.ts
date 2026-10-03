import { NextResponse } from "next/server";

import { readActivity } from "@/lib/activity/store";
import { fetchAllJobs } from "@/lib/jobs/fetch-jobs";
import { readJobsSnapshot, writeJobsSnapshot } from "@/lib/jobs/store";
import { readProfileRecord } from "@/lib/profile-store";
import { scoreSnapshot } from "@/lib/scoring/scored-jobs";
import type { JobsSnapshot } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Scoring happens on read rather than at fetch time, so editing the resume
 * re-ranks the stored jobs immediately without touching the network.
 */
async function withScores(snapshot: JobsSnapshot | null) {
  if (!snapshot) return null;
  const { profile } = await readProfileRecord();
  return scoreSnapshot(snapshot, profile);
}

/** Returns the cached snapshot without touching the network. */
export async function GET() {
  try {
    const snapshot = await readJobsSnapshot();
    return NextResponse.json({
      snapshot: await withScores(snapshot),
      activity: await readActivity(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not read the cached jobs: ${error.message}`
            : "Could not read the cached jobs.",
      },
      { status: 500 },
    );
  }
}

/**
 * Refreshes from the live feeds. Sources that fail are reported inside the
 * snapshot rather than failing the request, so a dead feed never hides the
 * working ones. The cache is only replaced when at least one source succeeded.
 */
export async function POST() {
  try {
    const previous = await readJobsSnapshot();
    const snapshot = await fetchAllJobs(previous);
    const anyLive = snapshot.sources.some((source) => source.ok);

    if (!anyLive && previous) {
      return NextResponse.json({
        snapshot: await withScores({ ...previous, sources: snapshot.sources }),
        activity: await readActivity(),
        warning:
          "Every source failed. Showing the last cached results with the current errors.",
      });
    }

    await writeJobsSnapshot(snapshot);
    return NextResponse.json({
      snapshot: await withScores(snapshot),
      activity: await readActivity(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Refresh failed: ${error.message}`
            : "Refresh failed.",
      },
      { status: 500 },
    );
  }
}
