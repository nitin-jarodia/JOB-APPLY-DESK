"use client";

import { useEffect, useMemo, useState } from "react";
import { InboxIcon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { JobCard } from "@/components/jobs/job-card";
import {
  EMPTY_FILTERS,
  isFiltered,
  JobFilters,
  type JobFilterState,
} from "@/components/jobs/job-filters";
import { JobsSkeleton } from "@/components/jobs/jobs-skeleton";
import { SourceStatus } from "@/components/jobs/source-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_JOB_STATUS, type ActivityMap } from "@/lib/activity/types";
import { formatDayTime } from "@/lib/format-date";
import { matchesSearch } from "@/lib/jobs/search";
import type { SourceName } from "@/lib/jobs/types";
import type { RoleFamily, ScoredJob, ScoredSnapshot } from "@/lib/scoring/types";

type JobsResponse = {
  snapshot: ScoredSnapshot | null;
  activity?: ActivityMap;
  warning?: string;
  error?: string;
};

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadCached(): Promise<{
  snapshot: ScoredSnapshot | null;
  activity: ActivityMap;
}> {
  const response = await fetch("/api/jobs", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await readError(response, `Request failed with ${response.status}.`));
  }
  const body = (await response.json()) as JobsResponse;
  return { snapshot: body.snapshot, activity: body.activity ?? {} };
}

function formatTimestamp(iso: string) {
  return formatDayTime(iso) ?? iso;
}

function publishedTime(job: ScoredJob): number {
  return job.publishedAt ? Date.parse(job.publishedAt) : 0;
}

export function JobsBoard() {
  const [snapshot, setSnapshot] = useState<ScoredSnapshot | null>(null);
  const [activity, setActivity] = useState<ActivityMap>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [filters, setFilters] = useState<JobFilterState>(EMPTY_FILTERS);

  useEffect(() => {
    let active = true;
    loadCached()
      .then((result) => {
        if (!active) return;
        setSnapshot(result.snapshot);
        setActivity(result.activity);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not reach the local API.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch("/api/jobs", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readError(response, `Refresh failed with ${response.status}.`));
      }
      const body = (await response.json()) as JobsResponse;
      if (body.snapshot) {
        setSnapshot(body.snapshot);
        setLoadError(null);
      }
      if (body.activity) setActivity(body.activity);
      if (body.warning) {
        setRefreshError(body.warning);
        toast.warning(body.warning);
      } else {
        const failed = body.snapshot?.sources.filter((source) => !source.ok) ?? [];
        if (failed.length > 0) {
          toast.warning(
            `Refreshed with ${failed.length} source${failed.length === 1 ? "" : "s"} down: ${failed.map((s) => s.label).join(", ")}`,
          );
        } else {
          toast.success(`Found ${body.snapshot?.jobs.length ?? 0} matching postings`);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not refresh the job list.";
      setRefreshError(message);
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  }

  const scanned = useMemo(
    () => (snapshot?.sources ?? []).reduce((sum, source) => sum + source.fetched, 0),
    [snapshot],
  );

  const jobs = useMemo(() => snapshot?.jobs ?? [], [snapshot]);

  const availableSources = useMemo(() => {
    const present = new Set<SourceName>(jobs.map((job) => job.source));
    return (snapshot?.sources ?? [])
      .map((source) => source.source)
      .filter((source) => present.has(source));
  }, [jobs, snapshot]);

  /** Every filter narrows the same list, so they stack rather than override. */
  const visible = useMemo(() => {
    const needle = filters.location.trim().toLowerCase();
    const matching = jobs.filter((job) => {
      if (!matchesSearch(job, filters.search)) return false;
      if (filters.family !== "any" && !job.scoring.families.includes(filters.family as RoleFamily)) {
        return false;
      }
      if (needle && !job.location.toLowerCase().includes(needle)) return false;
      if (filters.source !== "all" && job.source !== filters.source) return false;
      if (job.scoring.score < filters.minScore) return false;
      return true;
    });

    return filters.sort === "newest"
      ? [...matching].sort(
          (a, b) => publishedTime(b) - publishedTime(a) || b.scoring.score - a.scoring.score,
        )
      : matching;
  }, [jobs, filters]);

  if (loading) return <JobsSkeleton />;

  if (loadError) {
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>Could not load saved jobs</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{loadError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {snapshot ? (
            <>
              <Badge variant="secondary">
                {visible.length === jobs.length
                  ? `${jobs.length} matching ${jobs.length === 1 ? "posting" : "postings"}`
                  : `${visible.length} of ${jobs.length} shown`}
              </Badge>
              <span>
                from {scanned.toLocaleString()} scanned · fetched{" "}
                {formatTimestamp(snapshot.fetchedAt)}
              </span>
            </>
          ) : (
            <Badge variant="outline">Nothing fetched yet</Badge>
          )}
        </div>
        <Button onClick={() => void handleRefresh()} disabled={refreshing} size="sm">
          {refreshing ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
          {refreshing ? "Fetching…" : "Refresh"}
        </Button>
      </div>

      {refreshing ? (
        <p className="text-sm text-muted-foreground" role="status">
          Reading public JSON feeds. This takes around 20 seconds because every
          company board is a separate request.
        </p>
      ) : null}

      {refreshError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Refresh problem</AlertTitle>
          <AlertDescription>
            {refreshError} Anything already listed below is still the last good
            result.
          </AlertDescription>
        </Alert>
      ) : null}

      {snapshot ? <SourceStatus sources={snapshot.sources} /> : null}

      {jobs.length > 0 ? (
        <JobFilters
          filters={filters}
          onChange={setFilters}
          availableSources={availableSources}
        />
      ) : null}

      {!snapshot ? (
        <EmptyState
          title="No jobs fetched yet"
          body="Press Refresh to read the public JSON feeds. Nothing is fetched automatically, and no account or API key is involved."
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No postings matched"
          body={`All ${scanned.toLocaleString()} postings were read, but none were both India-eligible and an intern, new-grad, or junior software role. Entry-level openings are seasonal, so try again in a few days.`}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No postings match these filters"
          body={`All ${jobs.length} fetched postings were filtered out. Widen the filters to see them again.`}
          action={
            isFiltered(filters) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((job) => (
            <li key={job.id}>
              <JobCard job={job} status={activity[job.id]?.status ?? DEFAULT_JOB_STATUS} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
        <InboxIcon className="size-6 text-muted-foreground" aria-hidden />
        <h2 className="font-heading text-base font-medium">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
