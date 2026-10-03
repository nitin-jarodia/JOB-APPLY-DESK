import Link from "next/link";
import { InboxIcon } from "lucide-react";

import { BoundariesNote } from "@/components/boundaries-note";
import { ShortlistGroups } from "@/components/jobs/shortlist-groups";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readActivity } from "@/lib/activity/store";
import { readJobsSnapshot } from "@/lib/jobs/store";
import { readProfileRecord } from "@/lib/profile-store";
import { scoreJobs } from "@/lib/scoring/scored-jobs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shortlist · Job Apply Desk",
};

export default async function ShortlistPage() {
  const snapshot = await readJobsSnapshot();
  const activity = await readActivity();
  const { profile } = snapshot ? await readProfileRecord() : { profile: null };
  const jobs = snapshot && profile ? scoreJobs(snapshot.jobs, profile) : [];

  const hasHistory = Object.values(activity).some((entry) => entry.status !== "new");

  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 pb-16 sm:px-6">
      <header className="flex flex-col gap-2 py-6">
        <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          Shortlist
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your loop in one place: pick a strong role, build its resume, apply on
          the employer&rsquo;s own site, then mark what you did.
        </p>
      </header>

      {!snapshot && !hasHistory ? (
        <EmptyState
          title="No fetch has been run yet"
          body="Nothing is fetched automatically. Open the jobs page and press Refresh to read the public feeds, then the strongest India-eligible postings will be listed here."
          actionLabel="Go to jobs"
        />
      ) : (
        <ShortlistGroups
          jobs={jobs}
          activity={activity}
          totalFetched={snapshot?.jobs.length ?? 0}
        />
      )}

      <BoundariesNote />
    </main>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
}: {
  title: string;
  body: string;
  actionLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <InboxIcon className="size-6 text-muted-foreground" aria-hidden />
        <h2 className="font-heading text-base font-medium">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/jobs">{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
