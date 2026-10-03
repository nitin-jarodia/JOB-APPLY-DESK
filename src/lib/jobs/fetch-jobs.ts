import {
  fetchAshby,
  fetchGreenhouse,
  fetchHimalayas,
  fetchLever,
  fetchRemotive,
  type SourceHarvest,
} from "./sources";
import {
  JOBS_SNAPSHOT_VERSION,
  SOURCE_LABELS,
  type JobsSnapshot,
  type NormalizedJob,
  type SourceName,
  type SourceResult,
} from "./types";

type SourceSpec = {
  name: SourceName;
  run: () => Promise<SourceHarvest>;
  /**
   * Minimum gap between live requests. Remotive's own API notice asks callers
   * to fetch at most a few times a day, so its result is reused from cache
   * inside this window instead of being refetched.
   */
  minRefetchMs: number;
};

const SOURCES: SourceSpec[] = [
  { name: "himalayas", run: fetchHimalayas, minRefetchMs: 0 },
  { name: "remotive", run: fetchRemotive, minRefetchMs: 6 * 60 * 60 * 1000 },
  { name: "greenhouse", run: fetchGreenhouse, minRefetchMs: 0 },
  { name: "lever", run: fetchLever, minRefetchMs: 0 },
  { name: "ashby", run: fetchAshby, minRefetchMs: 0 },
];

/** Normalizes an apply URL so the same posting from two feeds collapses to one. */
function dedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${parsed.host.replace(/^www\./, "").toLowerCase()}${path}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function publishedTime(job: NormalizedJob): number {
  if (!job.publishedAt) return 0;
  const time = new Date(job.publishedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const byKey = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    const key = dedupeKey(job.applyUrl);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, job);
      continue;
    }
    // Prefer the employer's own board over an aggregator, then the newer post.
    const existingIsAggregator = existing.source === "himalayas" || existing.source === "remotive";
    const candidateIsAggregator = job.source === "himalayas" || job.source === "remotive";
    if (existingIsAggregator && !candidateIsAggregator) {
      byKey.set(key, job);
    } else if (existingIsAggregator === candidateIsAggregator && publishedTime(job) > publishedTime(existing)) {
      byKey.set(key, job);
    }
  }
  return [...byKey.values()];
}

export function sortJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const fitRank: Record<NormalizedJob["locationFit"], number> = {
    india: 0,
    "remote-india": 1,
    "worldwide-remote": 2,
  };
  return [...jobs].sort((a, b) => {
    const byDate = publishedTime(b) - publishedTime(a);
    if (byDate !== 0) return byDate;
    const byFit = fitRank[a.locationFit] - fitRank[b.locationFit];
    if (byFit !== 0) return byFit;
    return a.title.localeCompare(b.title);
  });
}

function reusable(previous: JobsSnapshot | null, spec: SourceSpec, now: number) {
  if (!previous || spec.minRefetchMs <= 0) return null;
  const prior = previous.sources.find((entry) => entry.source === spec.name);
  if (!prior || !prior.ok) return null;
  const fetchedAt = new Date(previous.fetchedAt).getTime();
  if (Number.isNaN(fetchedAt) || now - fetchedAt > spec.minRefetchMs) return null;
  return {
    result: prior,
    jobs: previous.jobs.filter((job) => job.source === spec.name),
  };
}

export async function fetchAllJobs(previous: JobsSnapshot | null): Promise<JobsSnapshot> {
  const now = Date.now();

  const perSource = await Promise.all(
    SOURCES.map(async (spec): Promise<{ result: SourceResult; jobs: NormalizedJob[] }> => {
      const cached = reusable(previous, spec, now);
      if (cached) {
        return {
          result: { ...cached.result, fromCache: true, kept: cached.jobs.length },
          jobs: cached.jobs,
        };
      }

      const started = Date.now();
      try {
        const harvest = await spec.run();
        const ok = !harvest.fatal;
        return {
          result: {
            source: spec.name,
            label: SOURCE_LABELS[spec.name],
            ok,
            fromCache: false,
            error: harvest.fatal ?? null,
            fetched: harvest.fetched,
            kept: harvest.jobs.length,
            requests: harvest.requests,
            failedEndpoints: harvest.failures,
            durationMs: Date.now() - started,
          },
          jobs: ok ? harvest.jobs : [],
        };
      } catch (error) {
        return {
          result: {
            source: spec.name,
            label: SOURCE_LABELS[spec.name],
            ok: false,
            fromCache: false,
            error: error instanceof Error ? error.message : "unexpected failure",
            fetched: 0,
            kept: 0,
            requests: 0,
            failedEndpoints: [],
            durationMs: Date.now() - started,
          },
          jobs: [],
        };
      }
    }),
  );

  const deduped = dedupeJobs(perSource.flatMap((entry) => entry.jobs));
  const keptBySource = new Map<SourceName, number>();
  for (const job of deduped) {
    keptBySource.set(job.source, (keptBySource.get(job.source) ?? 0) + 1);
  }

  return {
    version: JOBS_SNAPSHOT_VERSION,
    fetchedAt: new Date(now).toISOString(),
    jobs: sortJobs(deduped),
    sources: perSource.map((entry) => ({
      ...entry.result,
      kept: keptBySource.get(entry.result.source) ?? 0,
    })),
  };
}
