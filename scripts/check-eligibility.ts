/**
 * Guards the two promises the eligibility check makes:
 *
 *   1. a bar the posting really states is caught and quoted
 *   2. a number that is not a bar never produces a block
 *
 * The second matters more. A missed warning costs nothing, while a wrong block
 * hides a job he could have got, so most of the fixtures below are phrasings
 * that must *not* be read as requirements.
 *
 * Run with `npm run check:eligibility`.
 */

import assert from "node:assert/strict";

import { extractEligibilityBars } from "../src/lib/eligibility/bars";
import { checkEligibility } from "../src/lib/eligibility/check";
import { readJobsSnapshot } from "../src/lib/jobs/store";
import { SEED_PROFILE } from "../src/lib/seed-profile";

const profile = SEED_PROFILE;

/* -------------------------- the posting that failed ------------------------- */

const RUBRIK = `Proficiency in one or more general-purpose object-oriented programming languages like Java, C/C++, Scala, Python

Minimum eligibility criteria
- CGPA 8 and above
- 2027 graduates of Circuital branches only
- Available from January 2027 to May 2027 in Bangalore for the onsite internship (No remote options)`;

const rubrikBars = extractEligibilityBars(RUBRIK);
const rubrik = checkEligibility(rubrikBars, profile);

assert.equal(rubrik.blocked, true, "Rubrik CGPA 8 must block a 6.73 profile");

const cgpa = rubrik.findings.find((f) => f.bar.kind === "cgpa");
assert.ok(cgpa, "the CGPA bar must be found");
assert.equal(cgpa.outcome, "blocked");
assert.equal(cgpa.bar.strictness, "hard", "a heading of Minimum eligibility criteria is hard");
assert.match(cgpa.bar.evidence, /CGPA 8 and above/, "the bar must quote the posting");
assert.match(cgpa.bar.context ?? "", /Minimum eligibility criteria/);

const grad = rubrik.findings.find((f) => f.bar.kind === "graduation-year");
assert.ok(grad, "the 2027 graduates bar must be found");
assert.equal(grad.outcome, "met", "he graduates in 2027");

// "Available from January 2027 to May 2027" is a start date, not a batch.
assert.equal(
  rubrik.findings.filter((f) => f.bar.kind === "graduation-year").length,
  1,
  "an availability window must not be read as a graduating batch",
);

/* ------------------------- things that must not block ----------------------- */

const MUST_NOT_BLOCK: { key: string; text: string }[] = [
  { key: "soft-preferred", text: "Eligibility: CGPA 8 and above preferred." },
  { key: "soft-nice", text: "Requirements\n- A CGPA of 8.5 is nice to have" },
  { key: "ambiguous-scale", text: "Minimum eligibility: GPA 3.5 required" },
  { key: "no-threshold", text: "Please mention your CGPA in the application form." },
  { key: "remote-percent", text: "This role is 100% remote and requires 60% travel." },
  { key: "equity-percent", text: "Compensation includes equity with a 90% match." },
  { key: "unrelated-year", text: "We were founded in 2021 and shipped v2 in 2024." },
  { key: "start-date", text: "Available from January 2027 to May 2027 in Bangalore." },
  { key: "experience-years", text: "Minimum 2 years of experience required." },
  { key: "team-size", text: "Join a team of 8 engineers." },
];

for (const fixture of MUST_NOT_BLOCK) {
  const result = checkEligibility(extractEligibilityBars(fixture.text), profile);
  assert.equal(result.blocked, false, `${fixture.key} must not block: ${fixture.text}`);
}

/* --------------------------- bars that must be read ------------------------- */

const cgpaTen = checkEligibility(
  extractEligibilityBars("Minimum eligibility criteria\n- Minimum 7.5 CGPA out of 10"),
  profile,
);
assert.equal(cgpaTen.blocked, true, "7.5/10 must block a 6.73 profile");

const cgpaMet = checkEligibility(
  extractEligibilityBars("Eligibility criteria: CGPA 6 and above is required"),
  profile,
);
assert.equal(cgpaMet.blocked, false, "a 6.0 bar is met by 6.73");
assert.equal(cgpaMet.findings[0]?.outcome, "met");

const wrongBatch = checkEligibility(
  extractEligibilityBars("Eligibility: 2026 batch graduates only"),
  profile,
);
assert.equal(wrongBatch.blocked, true, "a 2026-only batch must block a 2027 graduate");

// His profile stores a CGPA, not a percentage, and the conversion is not
// standard, so a percentage bar is reported rather than decided.
const percent = checkEligibility(
  extractEligibilityBars("Eligibility criteria: 60% aggregate throughout academics"),
  profile,
);
assert.equal(percent.blocked, false, "a percentage bar must not block a CGPA profile");
assert.equal(percent.findings[0]?.outcome, "unverified");

/* ------------------------- every finding quotes itself ---------------------- */

const ALL = [RUBRIK, ...MUST_NOT_BLOCK.map((f) => f.text)];
for (const text of ALL) {
  for (const finding of checkEligibility(extractEligibilityBars(text), profile).findings) {
    assert.ok(
      finding.bar.evidence.trim().length > 0,
      "no finding may exist without the posting's own words",
    );
    assert.ok(
      text.replace(/\s+/g, " ").includes(finding.bar.evidence.replace(/…$/, "").trim()),
      `evidence must be a verbatim quote, got: ${finding.bar.evidence}`,
    );
  }
}

/* ------------------------------ the live cache ------------------------------ */

async function checkCachedPostings() {
  const snapshot = await readJobsSnapshot();
  if (!snapshot || snapshot.jobs.length === 0) {
    console.log("\nNo cached postings found, so only fixtures were checked.");
    return;
  }

  console.log(`\nCached postings (${snapshot.jobs.length} from data/jobs.json)\n`);
  for (const job of snapshot.jobs) {
    const result = checkEligibility(job.eligibilityBars ?? [], profile);
    console.log(`  ${result.blocked ? "BLOCKED" : "ok     "}  ${job.company} — ${job.title}`);
    for (const finding of result.findings) {
      console.log(`             ${finding.outcome}: ${finding.note}`);
      console.log(`             quote: "${finding.bar.evidence}"`);
      assert.ok(
        finding.bar.evidence.trim().length > 0,
        "a live posting may never be flagged without a quote",
      );
    }
  }
}

checkCachedPostings()
  .then(() => console.log("\nAll eligibility checks passed."))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
