import { NextResponse } from "next/server";

import { markResumeReady } from "@/lib/activity/store";
import { findScoredJobBySlug } from "@/lib/jobs/lookup";
import { readTailored, writeTailored } from "@/lib/tailor/store";
import { masterDocument, tailorResume } from "@/lib/tailor/tailor";
import type { TailoredRecord } from "@/lib/tailor/types";
import type { ProfileRecord } from "@/lib/profile-schema";
import type { ScoredJob } from "@/lib/scoring/types";

export const dynamic = "force-dynamic";

function build(job: ScoredJob, profileRecord: ProfileRecord): TailoredRecord {
  return {
    jobId: job.id,
    slug: job.slug,
    jobTitle: job.title,
    company: job.company,
    applyUrl: job.applyUrl,
    generatedAt: new Date().toISOString(),
    profileUpdatedAt: profileRecord.updatedAt,
    tailored: tailorResume(profileRecord.profile, job, job.scoring),
  };
}

async function resolve(slug: string | null) {
  if (!slug) {
    return { error: NextResponse.json({ error: "A job slug is required." }, { status: 400 }) };
  }
  const found = await findScoredJobBySlug(slug);
  if (!found) {
    return {
      error: NextResponse.json(
        { error: "That posting is not in the current cache." },
        { status: 404 },
      ),
    };
  }
  return { found };
}

/**
 * Returns the stored tailored resume for a job, generating and saving it the
 * first time. Storing it by job id is what makes it survive a page refresh.
 */
export async function GET(request: Request) {
  try {
    const { error, found } = await resolve(
      new URL(request.url).searchParams.get("slug"),
    );
    if (error) return error;

    const { job, profileRecord } = found;
    const master = masterDocument(profileRecord.profile);
    const stored = await readTailored(job.id);

    if (stored) {
      // A resume saved before this job had a status still counts as ready, so
      // the check runs on the stored path too rather than only on first build.
      const { changed } = await markResumeReady(job);
      // The resume can change after a tailored copy was saved, so the UI is
      // told rather than silently serving something built from older facts.
      return NextResponse.json({
        record: stored,
        master,
        stale: stored.profileUpdatedAt !== profileRecord.updatedAt,
        statusChanged: changed,
      });
    }

    const record = await writeTailored(build(job, profileRecord));
    // Building the resume is what makes a job "resume ready".
    const { changed } = await markResumeReady(job);
    return NextResponse.json({ record, master, stale: false, statusChanged: changed });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not build the tailored resume: ${error.message}`
            : "Could not build the tailored resume.",
      },
      { status: 500 },
    );
  }
}

/** Rebuilds from the current master resume and replaces the stored copy. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { slug?: string };
    const { error, found } = await resolve(body.slug ?? null);
    if (error) return error;

    const { job, profileRecord } = found;
    const record = await writeTailored(build(job, profileRecord));
    const { changed } = await markResumeReady(job);
    return NextResponse.json({
      record,
      master: masterDocument(profileRecord.profile),
      stale: false,
      statusChanged: changed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not rebuild the tailored resume: ${error.message}`
            : "Could not rebuild the tailored resume.",
      },
      { status: 500 },
    );
  }
}
