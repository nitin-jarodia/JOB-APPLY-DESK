import { NextResponse } from "next/server";

import { readActivity, setJobStatus } from "@/lib/activity/store";
import { JOB_STATUSES, type JobStatus } from "@/lib/activity/types";
import { findScoredJobBySlug } from "@/lib/jobs/lookup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ activity: await readActivity() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not read job statuses: ${error.message}`
            : "Could not read job statuses.",
      },
      { status: 500 },
    );
  }
}

/**
 * Sets a status from an explicit button press. There is no path here that runs
 * from opening the employer's link, which is why Apply never marks a job as
 * applied.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      slug?: string;
      status?: string;
    };

    if (!body.slug) {
      return NextResponse.json({ error: "A job slug is required." }, { status: 400 });
    }
    if (!body.status || !JOB_STATUSES.includes(body.status as JobStatus)) {
      return NextResponse.json(
        { error: `Status must be one of: ${JOB_STATUSES.join(", ")}.` },
        { status: 400 },
      );
    }

    const found = await findScoredJobBySlug(body.slug);
    if (!found) {
      return NextResponse.json(
        { error: "That posting is not in the current cache." },
        { status: 404 },
      );
    }

    const entry = await setJobStatus(found.job, body.status as JobStatus);
    return NextResponse.json({ entry, activity: await readActivity() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not save the status: ${error.message}`
            : "Could not save the status.",
      },
      { status: 500 },
    );
  }
}
