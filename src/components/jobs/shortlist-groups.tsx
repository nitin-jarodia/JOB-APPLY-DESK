"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, SearchIcon } from "lucide-react";

import { formatJobDate } from "@/components/jobs/job-card";
import { ScoreBadge } from "@/components/jobs/score-badge";
import { SkillLines } from "@/components/jobs/skill-lines";
import { StatusBadge } from "@/components/jobs/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_JOB_STATUS,
  type ActivityMap,
  type JobActivity,
  type JobStatus,
} from "@/lib/activity/types";
import { formatDay } from "@/lib/format-date";
import { matchesSearch } from "@/lib/jobs/search";
import type { ScoredJob } from "@/lib/scoring/types";

const SHORTLIST_SIZE = 6;
const ATS_SOURCES = new Set(["greenhouse", "lever", "ashby"]);

export function ShortlistGroups({
  jobs,
  activity,
  totalFetched,
}: {
  jobs: ScoredJob[];
  activity: ActivityMap;
  totalFetched: number;
}) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const found = jobs.filter((job) => matchesSearch(job, search));
    const statusOf = (job: ScoredJob) => activity[job.id]?.status ?? DEFAULT_JOB_STATUS;

    // The untouched group keeps the India-eligible narrowing the shortlist has
    // always had. Once he has acted on a role, hiding it by location would be
    // hiding his own work, so the other two groups show everything.
    const untouched = found.filter(
      (job) =>
        (statusOf(job) === "new" || statusOf(job) === "saved") &&
        (job.locationFit === "india" || job.locationFit === "remote-india"),
    );
    const resumeReady = found.filter((job) => statusOf(job) === "resume-ready");

    const byId = new Map(jobs.map((job) => [job.id, job]));
    const applied = Object.values(activity)
      .filter((entry) => entry.status === "applied")
      .filter((entry) => matchesSearch(entry, search))
      .sort((a, b) => (b.appliedAt ?? "").localeCompare(a.appliedAt ?? ""))
      .map((entry) => ({ entry, job: byId.get(entry.jobId) ?? null }));

    return { untouched, resumeReady, applied };
  }, [jobs, activity, search]);

  const skipped = Object.values(activity).filter((entry) => entry.status === "skipped").length;
  const searching = search.trim() !== "";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Label htmlFor="shortlist-search">Search title and company</Label>
        <div className="relative max-w-md">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="shortlist-search"
            value={search}
            placeholder="Intern, Rubrik, frontend…"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <Group
        title="Best roles you haven't acted on"
        description="India or remote and open to India, ranked against your saved resume."
        count={groups.untouched.length}
        empty={
          searching
            ? "No untouched role matches that search."
            : "Every India-eligible posting from the last fetch has already been saved, skipped, or applied to."
        }
      >
        {groups.untouched.slice(0, SHORTLIST_SIZE).map((job) => (
          <li key={job.id}>
            <ShortlistCard job={job} status={activity[job.id]?.status ?? DEFAULT_JOB_STATUS} />
          </li>
        ))}
      </Group>

      {groups.untouched.length > SHORTLIST_SIZE ? (
        <p className="-mt-6 text-sm text-muted-foreground">
          Showing the top {SHORTLIST_SIZE} of {groups.untouched.length}.{" "}
          <Link href="/jobs" className="underline underline-offset-4">
            See all {totalFetched} postings
          </Link>
          .
        </p>
      ) : null}

      <Group
        title="Resume ready"
        description="A tailored resume is saved for these. Copy or print it, then open Apply."
        count={groups.resumeReady.length}
        empty={
          searching
            ? "No resume-ready role matches that search."
            : "Open any posting to build its tailored resume. It will show up here afterwards."
        }
      >
        {groups.resumeReady.map((job) => (
          <li key={job.id}>
            <ShortlistCard job={job} status="resume-ready" />
          </li>
        ))}
      </Group>

      <Group
        title="Applied"
        description="Roles you marked yourself. Job Apply Desk never sets this for you."
        count={groups.applied.length}
        empty={
          searching
            ? "No applied role matches that search."
            : "Nothing marked yet. After you send an application, press “I applied” on that posting."
        }
      >
        {groups.applied.map(({ entry, job }) => (
          <li key={entry.jobId}>
            {job ? (
              <ShortlistCard job={job} status="applied" appliedAt={entry.appliedAt} />
            ) : (
              <ArchivedAppliedCard entry={entry} />
            )}
          </li>
        ))}
      </Group>

      {skipped > 0 ? (
        <p className="text-sm text-muted-foreground">
          {skipped} posting{skipped === 1 ? " is" : "s are"} marked skipped and kept
          off this page.{" "}
          <Link href="/jobs" className="underline underline-offset-4">
            They are still on the jobs page.
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Group({
  title,
  description,
  count,
  empty,
  children,
}: {
  title: string;
  description: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {count === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">{children}</ul>
      )}
    </section>
  );
}

function ShortlistCard({
  job,
  status,
  appliedAt,
}: {
  job: ScoredJob;
  status: JobStatus;
  appliedAt?: string | null;
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
            <p className="text-sm text-muted-foreground">
              {job.company} · {job.location}
              {published ? ` · ${published}` : ""}
            </p>
          </div>
          <ScoreBadge
            score={job.scoring.score}
            verdict={job.scoring.verdict}
            className="self-start"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} />
          <Badge variant="secondary">{job.sourceLabel}</Badge>
          <Badge variant="outline">
            {job.locationFit === "india" ? "In India" : "Remote, India eligible"}
          </Badge>
          {appliedAt ? (
            <span className="text-xs text-muted-foreground">
              marked {formatDay(appliedAt)}
            </span>
          ) : null}
        </div>

        <SkillLines matched={job.scoring.matched} gaps={job.scoring.gaps} />

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply on {applyTarget}
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/jobs/${job.slug}`}>
              {status === "resume-ready" ? "Open tailored resume" : "Why this score"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** An applied role whose posting has since dropped out of the feed. */
function ArchivedAppliedCard({ entry }: { entry: JobActivity }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-heading text-base leading-snug font-medium">{entry.title}</h3>
          <p className="text-sm text-muted-foreground">{entry.company}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status="applied" />
          <Badge variant="outline">No longer in the feed</Badge>
          {entry.appliedAt ? (
            <span className="text-xs text-muted-foreground">
              marked {formatDay(entry.appliedAt)}
            </span>
          ) : null}
        </div>
        <div>
          <Button asChild size="sm" variant="outline">
            <a href={entry.applyUrl} target="_blank" rel="noopener noreferrer">
              Open the posting
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
