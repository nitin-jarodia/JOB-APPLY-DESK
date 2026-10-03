/**
 * Guards the two promises the scoring engine makes:
 *
 *   1. a posting built on his real stack outranks an unrelated junior posting
 *   2. a gap is never something the resume already claims
 *
 * Run with `npm run check:scoring`. Fixtures are written here rather than
 * fetched so the check is deterministic and works offline; the live cache is
 * also scored when `data/jobs.json` exists.
 */

import assert from "node:assert/strict";

import { readJobsSnapshot } from "../src/lib/jobs/store";
import { extractResumeSkills } from "../src/lib/scoring/resume-skills";
import { scoreJob } from "../src/lib/scoring/score";
import { scoreJobs } from "../src/lib/scoring/scored-jobs";
import type { JobScore } from "../src/lib/scoring/types";
import { SEED_PROFILE } from "../src/lib/seed-profile";

const resume = extractResumeSkills(SEED_PROFILE);

type Fixture = { key: string; title: string; description: string };

const FIXTURES: Fixture[] = [
  {
    key: "strong-fullstack",
    title: "Software Engineer Intern, Full Stack",
    description: `We are looking for a full stack engineering intern to help build our customer dashboard.
      You will work in React and Next.js on the front end with TypeScript, and in Python with FastAPI on
      the back end. Our data lives in PostgreSQL with Redis for caching. Everything ships in Docker through
      GitHub Actions. You should be comfortable with REST APIs, Git, and writing unit tests.`,
  },
  {
    key: "strong-ai",
    title: "Applied AI Engineer, New Grad",
    description: `Join our applied AI team to build LLM applications. You will design prompt engineering
      workflows, build retrieval augmented generation pipelines with embeddings and vector search, and
      evaluate model output quality. Our stack is Python, FastAPI, and PostgreSQL. Experience with NLP and
      scikit-learn is a plus. This is a new grad role.`,
  },
  {
    key: "strong-frontend",
    title: "Frontend Engineer I",
    description: `Build our web application in React and TypeScript. You will work with Next.js, Tailwind
      CSS, and REST APIs, and write tests with Jest. We care about responsive design.`,
  },
  {
    key: "generic-intern",
    title: "Software Engineer, Intern",
    description: `Our interns work on real production systems alongside senior engineers. You will write
      code, review code, and ship features. We look for strong fundamentals in data structures and
      algorithms. Final year students are encouraged to apply.`,
  },
  {
    key: "unrelated-mobile",
    title: "Junior Android Developer",
    description: `Build native Android applications in Kotlin using Jetpack Compose. You will work with the
      Android SDK, Material Design, and the Play Store release process. Experience with Flutter or
      React Native is a plus. 0 to 2 years of experience.`,
  },
  {
    key: "unrelated-devops",
    title: "Junior DevOps Engineer",
    description: `Help run our infrastructure. You will manage Kubernetes clusters, write Terraform modules,
      configure Ansible playbooks, and maintain our AWS footprint with Prometheus and Grafana for
      observability. Jenkins pipeline experience preferred. Entry level candidates welcome.`,
  },
  {
    key: "unrelated-data",
    title: "Associate Data Engineer",
    description: `Build ETL pipelines with Spark and Airflow into our Snowflake data warehouse. You will
      write dbt models and support BI dashboards in Tableau. Entry level role.`,
  },
  {
    key: "unrelated-embedded",
    title: "Graduate Embedded Firmware Engineer",
    description: `Write firmware for our hardware platform. You will work in embedded C on RTOS targets,
      debug with oscilloscopes, and support VLSI bring-up. Graduate engineers welcome.`,
  },
];

const scored = FIXTURES.map((fixture) => ({
  ...fixture,
  result: scoreJob(fixture, resume, SEED_PROFILE),
}));

const byKey = new Map(scored.map((entry) => [entry.key, entry]));
const scoreOf = (key: string): number => {
  const entry = byKey.get(key);
  assert.ok(entry, `missing fixture ${key}`);
  return entry.result.score;
};

/* ----------------------------- the gap promise ---------------------------- */

function assertGapsAreHonest(label: string, scoring: JobScore) {
  const matchedIds = new Set(scoring.matched.map((skill) => skill.id));
  for (const gap of scoring.gaps) {
    assert.ok(
      !resume.byId.has(gap.id),
      `${label}: "${gap.label}" is listed as a gap but the resume already has it`,
    );
    assert.ok(
      !matchedIds.has(gap.id),
      `${label}: "${gap.label}" is listed as both an overlap and a gap`,
    );
    assert.match(
      gap.note,
      /not on his resume/,
      `${label}: gap note for "${gap.label}" does not say it is missing`,
    );
  }
  for (const skill of scoring.matched) {
    assert.ok(
      resume.byId.has(skill.id),
      `${label}: "${skill.label}" is listed as an overlap but is not on the resume`,
    );
  }
}

for (const entry of scored) assertGapsAreHonest(entry.key, entry.result);

/* ---------------------------- the ranking promise -------------------------- */

const STRONG = ["strong-fullstack", "strong-ai", "strong-frontend"];
const UNRELATED = ["unrelated-mobile", "unrelated-devops", "unrelated-data", "unrelated-embedded"];

for (const strong of STRONG) {
  for (const weak of UNRELATED) {
    assert.ok(
      scoreOf(strong) > scoreOf(weak),
      `${strong} (${scoreOf(strong)}) should outrank ${weak} (${scoreOf(weak)})`,
    );
  }
}

assert.ok(
  scoreOf("strong-fullstack") >= 70,
  `a React/Next.js/FastAPI/Python intern posting should score at least 70, got ${scoreOf("strong-fullstack")}`,
);
assert.ok(
  scoreOf("strong-ai") >= 70,
  `an LLM/embeddings new-grad posting should score at least 70, got ${scoreOf("strong-ai")}`,
);
for (const weak of UNRELATED) {
  assert.ok(
    scoreOf(weak) <= 40,
    `${weak} should score 40 or below, got ${scoreOf(weak)}`,
  );
}

/* ------------------------------- the report ------------------------------- */

function row(name: string, score: number, scoring: JobScore) {
  const overlap = scoring.matched.slice(0, 4).map((skill) => skill.label).join(", ") || "none";
  const gaps = scoring.gaps.slice(0, 3).map((gap) => gap.label).join(", ") || "none";
  console.log(
    `${String(score).padStart(3)}  ${name.padEnd(42).slice(0, 42)}  overlap: ${overlap.padEnd(40).slice(0, 40)}  gaps: ${gaps}`,
  );
}

console.log("\nFixtures (deterministic, offline)\n");
for (const entry of [...scored].sort((a, b) => b.result.score - a.result.score)) {
  row(entry.title, entry.result.score, entry.result);
}

async function checkCachedPostings() {
  const snapshot = await readJobsSnapshot();
  if (!snapshot || snapshot.jobs.length === 0) {
    console.log("\nNo cached postings found, so only fixtures were checked.");
    return;
  }

  const live = scoreJobs(snapshot.jobs, SEED_PROFILE);
  for (const job of live) assertGapsAreHonest(job.title, job.scoring);
  for (let index = 1; index < live.length; index += 1) {
    assert.ok(
      live[index - 1].scoring.score >= live[index].scoring.score,
      "scored jobs are not sorted highest first",
    );
  }

  console.log(`\nCached postings (${live.length} from data/jobs.json)\n`);
  for (const job of live) row(`${job.title} — ${job.company}`, job.scoring.score, job.scoring);
}

checkCachedPostings()
  .then(() => console.log("\nAll scoring checks passed."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
