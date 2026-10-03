/**
 * Guards the tailoring promise: a tailored resume may reorder, drop, or
 * re-summarise, but every claim it makes must already exist in the master
 * resume. Nothing from a job posting may leak into it.
 *
 * Run with `npm run check:tailoring`. Fixtures are deterministic and offline;
 * the real cache in `data/jobs.json` is also checked when present.
 */

import assert from "node:assert/strict";

import { readJobsSnapshot } from "../src/lib/jobs/store";
import type { Profile } from "../src/lib/profile-schema";
import { extractResumeSkills } from "../src/lib/scoring/resume-skills";
import { scoreJob } from "../src/lib/scoring/score";
import { scoreJobs } from "../src/lib/scoring/scored-jobs";
import { findSkills } from "../src/lib/scoring/skills";
import type { JobScore } from "../src/lib/scoring/types";
import { resumeToPlainText } from "../src/lib/tailor/render";
import { tailorResume } from "../src/lib/tailor/tailor";
import type { TailoredResume } from "../src/lib/tailor/types";
import { SEED_PROFILE } from "../src/lib/seed-profile";

const profile = SEED_PROFILE;
const resumeIndex = extractResumeSkills(profile);

const FIXTURES = [
  {
    title: "Software Engineer Intern, Full Stack",
    description:
      "React, Next.js, TypeScript on the front end, Python and FastAPI on the back end, PostgreSQL and Redis, Docker and GitHub Actions, REST APIs and unit tests.",
  },
  {
    title: "Applied AI Engineer, New Grad",
    description:
      "Build LLM applications with embeddings, vector search, and retrieval augmented generation. Python, FastAPI, PostgreSQL. NLP and scikit-learn a plus.",
  },
  {
    title: "Junior Android Developer",
    description:
      "Native Android in Kotlin with Jetpack Compose, the Android SDK, and the Play Store release process.",
  },
  {
    title: "Associate Data Engineer",
    description: "ETL pipelines with Spark and Airflow into Snowflake. dbt models, Tableau.",
  },
];

/* --------------------------- the faithfulness check -------------------------- */

function assertFaithful(
  label: string,
  master: Profile,
  tailored: TailoredResume,
  scoring: JobScore,
) {
  const doc = tailored.document;

  // Contact details are copied through byte for byte.
  assert.deepEqual(doc.contact, master.contact, `${label}: contact details changed`);

  // Education and achievements carry the CGPA, the degree, and the dates.
  assert.deepEqual(doc.education, master.education, `${label}: education changed`);
  assert.deepEqual(
    doc.achievements,
    master.achievements,
    `${label}: achievements changed`,
  );

  // Every real skill survives and no new one appears.
  const masterSkills = master.skillGroups.flatMap((group) => group.skills).sort();
  const tailoredSkills = doc.skillGroups.flatMap((group) => group.skills).sort();
  assert.deepEqual(
    tailoredSkills,
    masterSkills,
    `${label}: the skill set changed rather than being reordered`,
  );

  // Experience keeps its identity and dates; only bullet order may change.
  assert.equal(
    doc.experience.length,
    master.experience.length,
    `${label}: an experience entry was added or removed`,
  );
  for (const entry of doc.experience) {
    const original = master.experience.find((candidate) => candidate.id === entry.id);
    assert.ok(original, `${label}: unknown experience entry "${entry.id}"`);
    assert.equal(entry.role, original.role, `${label}: role changed`);
    assert.equal(entry.organization, original.organization, `${label}: employer changed`);
    assert.equal(entry.location, original.location, `${label}: work location changed`);
    assert.equal(entry.period, original.period, `${label}: employment dates changed`);
    for (const bullet of entry.bullets) {
      assert.ok(
        original.bullets.includes(bullet),
        `${label}: experience bullet was rewritten: "${bullet}"`,
      );
    }
  }

  // Projects may be reordered and may lose a bullet, never gain one.
  for (const project of doc.projects) {
    const original = master.projects.find((candidate) => candidate.id === project.id);
    assert.ok(original, `${label}: unknown project "${project.id}"`);
    assert.equal(project.name, original.name, `${label}: project name changed`);
    assert.deepEqual(
      [...project.stack].sort(),
      [...original.stack].sort(),
      `${label}: project stack changed rather than being reordered`,
    );
    for (const bullet of project.bullets) {
      assert.ok(
        original.bullets.includes(bullet),
        `${label}: project bullet was rewritten: "${bullet}"`,
      );
    }
  }
  assert.equal(
    doc.projects.length,
    master.projects.length,
    `${label}: a project was added or removed`,
  );

  // The summary is the only rewritten text, and it must keep the anchor.
  assert.ok(
    doc.summary.includes("Final-year B.Tech student at IIIT Surat"),
    `${label}: the summary dropped the IIIT Surat anchor`,
  );
  for (const technology of tailored.notes.summaryTechnologies) {
    assert.ok(
      masterSkills.includes(technology),
      `${label}: the summary names "${technology}", which is not a stored skill`,
    );
  }

  // Nothing the posting asked for may appear anywhere in the document, and no
  // technology outside the resume may either.
  const documentSkillIds = new Set(findSkills(resumeToPlainText(doc)).keys());
  for (const gap of scoring.gaps) {
    assert.ok(
      !documentSkillIds.has(gap.id),
      `${label}: gap "${gap.label}" leaked into the tailored resume`,
    );
  }
  for (const id of documentSkillIds) {
    assert.ok(
      resumeIndex.byId.has(id),
      `${label}: tailored resume mentions "${id}", which the master resume never does`,
    );
  }

  // Dropped bullets must be genuine master bullets, not inventions.
  const allMasterBullets = new Set([
    ...master.experience.flatMap((entry) => entry.bullets),
    ...master.projects.flatMap((project) => project.bullets),
  ]);
  for (const omitted of tailored.notes.omittedBullets) {
    assert.ok(
      allMasterBullets.has(omitted.text),
      `${label}: reported dropping a bullet that is not in the master resume`,
    );
  }
}

/* -------------------------- the user's stated anchors ------------------------- */

function assertSeedAnchors(label: string, tailored: TailoredResume) {
  const education = tailored.document.education[0];
  assert.equal(education.score, "CGPA: 6.73/10", `${label}: CGPA changed`);
  assert.equal(education.period, "2023 – 2027", `${label}: degree dates changed`);
  assert.equal(
    tailored.document.experience[0].period,
    "Mar 2026 – Jun 2026",
    `${label}: employment dates changed`,
  );
}

/* --------------------------------- fixtures --------------------------------- */

console.log("\nFixtures (deterministic, offline)\n");
for (const fixture of FIXTURES) {
  const scoring = scoreJob(fixture, resumeIndex, profile);
  const tailored = tailorResume(profile, fixture, scoring);
  assertFaithful(fixture.title, profile, tailored, scoring);
  assertSeedAnchors(fixture.title, tailored);
  console.log(`  ${fixture.title}`);
  console.log(`    summary: ${tailored.document.summary}`);
  console.log(
    `    promoted: ${tailored.notes.highlighted.join(", ") || "none"} | dropped bullets: ${tailored.notes.omittedBullets.length}`,
  );
}

/* ------------------------------- real postings ------------------------------- */

async function checkCachedPostings() {
  const snapshot = await readJobsSnapshot();
  if (!snapshot || snapshot.jobs.length === 0) {
    console.log("\nNo cached postings found, so only fixtures were checked.");
    return;
  }

  const jobs = scoreJobs(snapshot.jobs, profile);
  console.log(`\nCached postings (${jobs.length} from data/jobs.json)\n`);

  for (const job of jobs) {
    const tailored = tailorResume(profile, job, job.scoring);
    const label = `${job.title} — ${job.company}`;
    assertFaithful(label, profile, tailored, job.scoring);
    assertSeedAnchors(label, tailored);
    console.log(`  ${label}`);
    console.log(`    summary: ${tailored.document.summary}`);
    console.log(
      `    promoted: ${tailored.notes.highlighted.join(", ") || "none"} | dropped bullets: ${tailored.notes.omittedBullets.length} | apply: ${job.applyUrl}`,
    );
  }

  assert.ok(
    jobs.length > 0,
    "at least one real fetched posting must produce a tailored resume",
  );
}

checkCachedPostings()
  .then(() => console.log("\nAll tailoring checks passed."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
