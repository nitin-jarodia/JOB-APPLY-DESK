import {
  ASHBY_BOARDS,
  GREENHOUSE_BOARDS,
  HIMALAYAS_QUERIES,
  LEVER_BOARDS,
  type Board,
} from "./boards";
import { classifyLocation, classifySeniority } from "./filters";
import { FeedError, describeEndpoint, getJson, mapWithConcurrency } from "./http";
import { htmlToText, truncate } from "./text";
import { SOURCE_LABELS, type NormalizedJob, type SourceName } from "./types";

const DESCRIPTION_LIMIT = 4000;

export type EndpointFailure = { endpoint: string; reason: string };

export type SourceHarvest = {
  jobs: NormalizedJob[];
  fetched: number;
  requests: number;
  failures: EndpointFailure[];
  /** Thrown only when the whole source is unusable. */
  fatal?: string;
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    // Himalayas sends seconds, Lever sends milliseconds.
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function buildJob(params: {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  source: SourceName;
  publishedAt: string | null;
  countries?: string[];
  timezones?: number[];
  remoteFlag?: boolean;
  sourceSeniority?: string[];
}): NormalizedJob | null {
  const title = params.title.trim();
  const applyUrl = params.applyUrl?.trim();
  if (!title || !applyUrl) return null;

  const description = params.description ?? "";

  const seniority = classifySeniority({
    title,
    description,
    sourceSeniority: params.sourceSeniority,
  });
  if (!seniority.ok) return null;

  const location = classifyLocation({
    text: params.location ?? "",
    countries: params.countries,
    timezones: params.timezones,
    remoteFlag: params.remoteFlag,
    description,
  });
  if (!location.ok) return null;

  return {
    id: `${params.source}:${params.id}`,
    title,
    company: params.company.trim() || "Unknown company",
    location: (params.location ?? "").trim() || "Remote",
    isRemote: location.isRemote,
    description: truncate(description, DESCRIPTION_LIMIT),
    applyUrl,
    source: params.source,
    sourceLabel: SOURCE_LABELS[params.source],
    publishedAt: params.publishedAt,
    locationFit: location.fit,
  };
}

function failureOf(error: unknown, fallbackEndpoint: string): EndpointFailure {
  if (error instanceof FeedError) {
    return { endpoint: error.endpoint, reason: error.message };
  }
  return {
    endpoint: fallbackEndpoint,
    reason: error instanceof Error ? error.message : "unknown error",
  };
}

/* ------------------------------- Himalayas ------------------------------- */

type HimalayasJob = {
  title?: string;
  companyName?: string;
  description?: string;
  excerpt?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
  seniority?: string[];
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
  employmentType?: string;
};

export async function fetchHimalayas(): Promise<SourceHarvest> {
  const failures: EndpointFailure[] = [];
  const collected = new Map<string, NormalizedJob>();
  let fetched = 0;

  const results = await mapWithConcurrency(HIMALAYAS_QUERIES, 3, async (spec) => {
    const url = new URL("https://himalayas.app/jobs/api/search");
    url.searchParams.set("query", spec.query);
    if (spec.country) url.searchParams.set("country", spec.country);
    url.searchParams.set("seniority", spec.seniority);
    try {
      const data = await getJson<{ jobs?: HimalayasJob[] }>(url.toString());
      if (!Array.isArray(data.jobs)) {
        throw new FeedError(describeEndpoint(url.toString()), "response has no jobs array");
      }
      return { jobs: data.jobs, failure: null as EndpointFailure | null };
    } catch (error) {
      return { jobs: [] as HimalayasJob[], failure: failureOf(error, describeEndpoint(url.toString())) };
    }
  });

  for (const result of results) {
    if (result.failure) failures.push(result.failure);
    for (const raw of result.jobs) {
      fetched += 1;
      const link = raw.applicationLink || raw.guid;
      if (!link) continue;
      const job = buildJob({
        id: raw.guid || link,
        title: raw.title ?? "",
        company: raw.companyName ?? "",
        location: (raw.locationRestrictions ?? []).join(", ") || "Remote",
        description: htmlToText(raw.description || raw.excerpt),
        applyUrl: link.startsWith("http") ? link : `https://himalayas.app/${link.replace(/^\//, "")}`,
        source: "himalayas",
        publishedAt: toIso(raw.pubDate),
        countries: raw.locationRestrictions?.length ? raw.locationRestrictions : undefined,
        timezones: raw.timezoneRestrictions,
        remoteFlag: true,
        sourceSeniority: raw.seniority,
      });
      if (job) collected.set(job.applyUrl, job);
    }
  }

  const harvest: SourceHarvest = {
    jobs: [...collected.values()],
    fetched,
    requests: HIMALAYAS_QUERIES.length,
    failures,
  };
  if (failures.length === HIMALAYAS_QUERIES.length) {
    harvest.fatal = failures[0]?.reason ?? "every Himalayas query failed";
  }
  return harvest;
}

/* -------------------------------- Remotive -------------------------------- */

type RemotiveJob = {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  publication_date?: string;
  candidate_required_location?: string;
  description?: string;
  job_type?: string;
};

export async function fetchRemotive(): Promise<SourceHarvest> {
  const url = "https://remotive.com/api/remote-jobs?category=software-dev";
  try {
    const data = await getJson<{ jobs?: RemotiveJob[] }>(url);
    if (!Array.isArray(data.jobs)) {
      throw new FeedError(describeEndpoint(url), "response has no jobs array");
    }
    const jobs: NormalizedJob[] = [];
    for (const raw of data.jobs) {
      if (!raw.url) continue;
      const job = buildJob({
        id: String(raw.id ?? raw.url),
        title: raw.title ?? "",
        company: raw.company_name ?? "",
        location: raw.candidate_required_location ?? "Remote",
        description: htmlToText(raw.description),
        // Remotive's terms require linking back to the Remotive URL and naming
        // Remotive as the source.
        applyUrl: raw.url,
        source: "remotive",
        publishedAt: toIso(raw.publication_date),
        remoteFlag: true,
      });
      if (job) jobs.push(job);
    }
    return { jobs, fetched: data.jobs.length, requests: 1, failures: [] };
  } catch (error) {
    const failure = failureOf(error, describeEndpoint(url));
    return {
      jobs: [],
      fetched: 0,
      requests: 1,
      failures: [failure],
      fatal: failure.reason,
    };
  }
}

/* ------------------------------- Greenhouse ------------------------------- */

type GreenhouseJob = {
  id?: number;
  title?: string;
  absolute_url?: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  content?: string;
  company_name?: string;
};

type BoardExtract = { rawCount: number; jobs: NormalizedJob[] };

async function harvestBoards(
  source: SourceName,
  boards: Board[],
  buildUrl: (board: Board) => string,
  extract: (payload: unknown, board: Board) => BoardExtract | null,
): Promise<SourceHarvest> {
  const results = await mapWithConcurrency(boards, 5, async (board) => {
    const url = buildUrl(board);
    try {
      // Lever in particular is slow on large boards, so this is generous.
      const payload = await getJson<unknown>(url, 35000);
      const extracted = extract(payload, board);
      if (extracted === null) {
        throw new FeedError(describeEndpoint(url), "response shape changed");
      }
      return { board, extracted, failure: null as EndpointFailure | null };
    } catch (error) {
      return {
        board,
        extracted: { rawCount: 0, jobs: [] } as BoardExtract,
        failure: failureOf(error, describeEndpoint(url)),
      };
    }
  });

  const failures: EndpointFailure[] = [];
  const jobs: NormalizedJob[] = [];
  let fetched = 0;

  for (const result of results) {
    if (result.failure) {
      failures.push({
        endpoint: `${result.board.company} (${result.failure.endpoint})`,
        reason: result.failure.reason,
      });
      continue;
    }
    fetched += result.extracted.rawCount;
    jobs.push(...result.extracted.jobs);
  }

  const harvest: SourceHarvest = {
    jobs,
    fetched,
    requests: boards.length,
    failures,
  };
  if (failures.length === boards.length) {
    harvest.fatal = `all ${boards.length} ${SOURCE_LABELS[source]} boards failed`;
  }
  return harvest;
}

export async function fetchGreenhouse(): Promise<SourceHarvest> {
  return harvestBoards(
    "greenhouse",
    GREENHOUSE_BOARDS,
    (board) =>
      `https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`,
    (payload, board) => {
      const data = payload as { jobs?: GreenhouseJob[] };
      if (!Array.isArray(data?.jobs)) return null;
      const out: NormalizedJob[] = [];
      for (const raw of data.jobs) {
        if (!raw.absolute_url) continue;
        const job = buildJob({
          id: String(raw.id ?? raw.absolute_url),
          title: raw.title ?? "",
          // Greenhouse's own company_name is often the board's label, such as
          // "Rubrik Job Board", so the curated name wins.
          company: board.company,
          location: raw.location?.name ?? "",
          description: htmlToText(raw.content),
          applyUrl: raw.absolute_url,
          source: "greenhouse",
          publishedAt: toIso(raw.first_published ?? raw.updated_at),
        });
        if (job) out.push(job);
      }
      return { rawCount: data.jobs.length, jobs: out };
    },
  );
}

/* ---------------------------------- Lever --------------------------------- */

type LeverJob = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  categories?: { location?: string; allLocations?: string[]; commitment?: string };
  createdAt?: number;
  descriptionPlain?: string;
  workplaceType?: string;
};

export async function fetchLever(): Promise<SourceHarvest> {
  return harvestBoards(
    "lever",
    LEVER_BOARDS,
    (board) => `https://api.lever.co/v0/postings/${board.token}?mode=json`,
    (payload, board) => {
      if (!Array.isArray(payload)) return null;
      const rows = payload as LeverJob[];
      const out: NormalizedJob[] = [];
      for (const raw of rows) {
        // hostedUrl is the public posting page; applyUrl is the submission
        // form, which this app never touches.
        if (!raw.hostedUrl) continue;
        const locations =
          raw.categories?.allLocations?.length
            ? raw.categories.allLocations.join(", ")
            : (raw.categories?.location ?? "");
        const job = buildJob({
          id: String(raw.id ?? raw.hostedUrl),
          title: raw.text ?? "",
          company: board.company,
          location: locations,
          description: raw.descriptionPlain ?? "",
          applyUrl: raw.hostedUrl,
          source: "lever",
          publishedAt: toIso(raw.createdAt),
          remoteFlag: /remote/i.test(raw.workplaceType ?? ""),
        });
        if (job) out.push(job);
      }
      return { rawCount: rows.length, jobs: out };
    },
  );
}

/* ---------------------------------- Ashby --------------------------------- */

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  publishedAt?: string;
  isRemote?: boolean;
  isListed?: boolean;
  jobUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
};

export async function fetchAshby(): Promise<SourceHarvest> {
  return harvestBoards(
    "ashby",
    ASHBY_BOARDS,
    (board) => `https://api.ashbyhq.com/posting-api/job-board/${board.token}`,
    (payload, board) => {
      const data = payload as { jobs?: AshbyJob[] };
      if (!Array.isArray(data?.jobs)) return null;
      const out: NormalizedJob[] = [];
      for (const raw of data.jobs) {
        // jobUrl is the public posting page; applyUrl is the application form.
        if (!raw.jobUrl || raw.isListed === false) continue;
        const secondary = (raw.secondaryLocations ?? [])
          .map((entry) => entry.location)
          .filter(Boolean)
          .join(", ");
        const location = [raw.location, secondary].filter(Boolean).join(", ");
        const job = buildJob({
          id: String(raw.id ?? raw.jobUrl),
          title: raw.title ?? "",
          company: board.company,
          location,
          description: raw.descriptionPlain ?? "",
          applyUrl: raw.jobUrl,
          source: "ashby",
          publishedAt: toIso(raw.publishedAt),
          remoteFlag: Boolean(raw.isRemote),
        });
        if (job) out.push(job);
      }
      return { rawCount: data.jobs.length, jobs: out };
    },
  );
}
