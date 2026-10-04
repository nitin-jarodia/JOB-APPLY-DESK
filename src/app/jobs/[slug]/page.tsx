import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BuildingIcon,
  CalendarIcon,
  MapPinIcon,
  MinusIcon,
} from "lucide-react";

import { BoundariesNote } from "@/components/boundaries-note";
import { formatJobDate } from "@/components/jobs/job-card";
import { JobStatusControls } from "@/components/jobs/job-status-controls";
import {
  EligibilityBadge,
  EligibilityNotice,
} from "@/components/jobs/eligibility-notice";
import { ScoreBreakdown } from "@/components/jobs/score-breakdown";
import { StatusBadge } from "@/components/jobs/status-badge";
import { TailoredResumePanel } from "@/components/jobs/tailored-resume-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readActivity } from "@/lib/activity/store";
import { DEFAULT_JOB_STATUS } from "@/lib/activity/types";
import { findScoredJobBySlug } from "@/lib/jobs/lookup";
import type { NormalizedJob } from "@/lib/jobs/types";
import { ROLE_FAMILY_LABELS } from "@/lib/scoring/types";

export const dynamic = "force-dynamic";

const FIT_LABEL: Record<NormalizedJob["locationFit"], string> = {
  india: "In India",
  "remote-india": "Remote, India eligible",
  "worldwide-remote": "Worldwide remote",
};

const ATS_SOURCES = new Set(["greenhouse", "lever", "ashby"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await findScoredJobBySlug(slug);
  return {
    title: found
      ? `${found.job.title} · ${found.job.company} · Job Apply Desk`
      : "Posting not found · Job Apply Desk",
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = await findScoredJobBySlug(slug);
  if (!found) notFound();

  const { job } = found;
  const activity = await readActivity();
  const entry = activity[job.id];
  const status = entry?.status ?? DEFAULT_JOB_STATUS;
  const published = formatJobDate(job.publishedAt);
  const applyTarget = ATS_SOURCES.has(job.source) ? job.company : job.sourceLabel;
  const truncated = job.description.endsWith("…");

  return (
    <main className="mx-auto w-full max-w-5xl grow px-4 pb-16 sm:px-6">
      <div className="py-6 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/jobs">
            <ArrowLeftIcon />
            All jobs
          </Link>
        </Button>
      </div>

      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-heading text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
            {job.title}
          </h1>
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <BuildingIcon className="size-3.5 shrink-0" aria-hidden />
              <dt className="sr-only">Company</dt>
              <dd>{job.company}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
              <dt className="sr-only">Location</dt>
              <dd>{job.location}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
              <dt className="sr-only">Published</dt>
              <dd>{published ?? "Date not provided"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-1.5">
            <EligibilityBadge eligibility={job.scoring.eligibility} />
            <StatusBadge status={status} />
            <Badge variant="secondary">{job.sourceLabel}</Badge>
            <Badge variant="outline">{FIT_LABEL[job.locationFit]}</Badge>
            {job.scoring.families.map((family) => (
              <Badge key={family} variant="outline">
                {ROLE_FAMILY_LABELS[family]}
              </Badge>
            ))}
            <Badge variant="outline">{job.scoring.seniorityLabel}</Badge>
          </div>
        </header>

        {/* Above the score on purpose. The bug this fixes was a role he could
            not apply for reading as a strong match, so the requirement has to
            be visible before the number is. */}
        <EligibilityNotice eligibility={job.scoring.eligibility} />

        <ScoreBreakdown scoring={job.scoring} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apply</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                  Apply on {applyTarget}
                  <ArrowUpRightIcon data-icon="inline-end" />
                </a>
              </Button>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {job.applyUrl}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              This opens {job.sourceLabel}&rsquo;s own posting page in a new tab
              and does nothing else. Nothing is submitted for you, and no form
              on that page is filled in or sent.
            </p>

            {/* Keyed on the stored status so a server re-render after the
                tailored resume is built resets the controls to match the
                badge above, rather than leaving them on a stale value. */}
            <JobStatusControls
              key={`${status}:${entry?.appliedAt ?? ""}`}
              slug={job.slug}
              initialStatus={status}
              initialAppliedAt={entry?.appliedAt ?? null}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Gaps: what this posting asks for that you do not have
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {job.scoring.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing this posting names is missing from your resume.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  These lowered the score and are deliberately left off the
                  tailored resume below. They are requirements you have not
                  listed, not skills you already hold.
                </p>
                <ul className="flex flex-col gap-2">
                  {job.scoring.gaps.map((gap) => (
                    <li key={gap.id} className="flex items-start gap-2 text-sm">
                      <MinusIcon
                        className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden
                      />
                      <span>{gap.note}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <TailoredResumePanel slug={job.slug} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Original description</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {job.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This source did not provide a description. Open the posting to
                read it.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Text as {job.sourceLabel} returned it
              {truncated ? ", cut off at 4,000 characters" : ""}. The posting
              itself is the authority.
            </p>
          </CardContent>
        </Card>
      </article>

      <BoundariesNote />
    </main>
  );
}
