import Link from "next/link";
import { ArrowUpRightIcon, BuildingIcon, CalendarIcon, MapPinIcon } from "lucide-react";

import { EligibilityBadge } from "@/components/jobs/eligibility-notice";
import { ScoreBadge } from "@/components/jobs/score-badge";
import { SkillLines } from "@/components/jobs/skill-lines";
import { StatusBadge } from "@/components/jobs/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_JOB_STATUS, type JobStatus } from "@/lib/activity/types";
import { formatDay } from "@/lib/format-date";
import type { NormalizedJob } from "@/lib/jobs/types";
import { ROLE_FAMILY_LABELS, type ScoredJob } from "@/lib/scoring/types";

const FIT_LABEL: Record<NormalizedJob["locationFit"], string> = {
  india: "In India",
  "remote-india": "Remote, India eligible",
  "worldwide-remote": "Worldwide remote",
};

const ATS_SOURCES = new Set(["greenhouse", "lever", "ashby"]);

export function formatJobDate(iso: string | null) {
  return formatDay(iso);
}

export function JobCard({
  job,
  status = DEFAULT_JOB_STATUS,
}: {
  job: ScoredJob;
  status?: JobStatus;
}) {
  const published = formatJobDate(job.publishedAt);
  const applyTarget = ATS_SOURCES.has(job.source) ? job.company : job.sourceLabel;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-heading text-base leading-snug font-medium">
              <Link href={`/jobs/${job.slug}`} className="hover:underline">
                {job.title}
              </Link>
            </h3>
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
          </div>
          <ScoreBadge
            score={job.scoring.score}
            verdict={job.scoring.verdict}
            ineligible={job.scoring.eligibility.blocked}
            className="self-start"
          />
        </div>

        {job.scoring.eligibility.blocked ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive dark:text-red-300">
            {job.scoring.eligibility.findings.find((finding) => finding.outcome === "blocked")
              ?.note}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <EligibilityBadge eligibility={job.scoring.eligibility} />
          <StatusBadge status={status} />
          <Badge variant="secondary">{job.sourceLabel}</Badge>
          <Badge variant="outline">{FIT_LABEL[job.locationFit]}</Badge>
          <Badge variant="outline">{ROLE_FAMILY_LABELS[job.scoring.families[0]]}</Badge>
          {job.isRemote ? <Badge variant="outline">Remote</Badge> : null}
        </div>

        <SkillLines matched={job.scoring.matched} gaps={job.scoring.gaps} />

        {job.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply on {applyTarget}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/jobs/${job.slug}`}>Why this score</Link>
          </Button>
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {job.applyUrl}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
