import type { BarStrictness, EligibilityBar } from "./types";

/**
 * Reads the numeric bars a posting states about the candidate rather than about
 * the work: CGPA, percentage, and graduating batch.
 *
 * Every pattern here is deliberately narrow. A bar that is missed only costs a
 * warning that never appears, while a bar invented out of an unrelated number
 * would tell him he is ineligible for a job he could get, so anything unclear
 * is dropped instead of guessed.
 */

/** Optional-sounding phrasing. Checked first so "CGPA 8 preferred" never blocks. */
const SOFT_MARKER =
  /\b(preferred|preferable|preferably|nice to have|good to have|desirable|desirably|ideally|a plus|bonus|added advantage)\b/i;

/**
 * Mandatory phrasing. A heading like "Minimum eligibility criteria" usually sits
 * on its own line above the bullet it governs, so the preceding text is searched
 * as well as the matched line.
 */
const HARD_MARKER =
  /\b(minimum eligibility|eligibility criteria|eligibility|mandatory|must have|must be|must|required|requires|requirement|strictly|only|at least|minimum|min\.)\b/i;

/** A short heading directly above a bullet is quoted alongside it for context. */
const HEADING_MARKER = /\b(eligibility|criteria|requirements?|qualifications?|who can apply)\b/i;
const HEADING_MAX_LENGTH = 70;

const CONTEXT_WINDOW = 220;
const EVIDENCE_MAX_LENGTH = 200;

const CGPA_KEYWORD = /\b(?:cgpa|gpa|grade point average)\b/i;
const GRADE_NUMBER = /\b(\d{1,2}(?:\.\d{1,2})?)\b/g;
/** How far from the CGPA keyword a number may sit and still be its threshold. */
const GRADE_NEAR = 40;

const SCALE_10 = /(?:\/\s*10|out of 10|on a 10|10[-\s]?point)/i;
const SCALE_4 = /(?:\/\s*4|out of 4|on a 4|4[-\s]?point)/i;

const PERCENT_NUMBER = /\b(\d{2}(?:\.\d+)?)\s*(?:%|percent\b)/i;
/** Percentages are everywhere in a job ad, so one only counts in an academic line. */
const PERCENT_CONTEXT =
  /\b(aggregate|throughout|academics?|marks|percentage|graduation|degree|10th|12th|xii|secondary|semester|backlogs?|scoring|score)\b/i;
const PERCENT_EXCLUDE =
  /\b(remote|equity|discount|match(?:ing)?|contribution|ownership|growth|increase|revenue|bonus pool|time off)\b/i;
/** Indian degree classification. "First class" is the conventional 60% bar. */
const FIRST_CLASS = /\bfirst class\b/i;
const FIRST_CLASS_PERCENT = 60;

const GRAD_CONTEXT =
  /\b(graduat\w*|batch|class of|passout|pass[-\s]?out|passing out|convocation)\b/i;
const YEAR = /\b(20[2-3]\d)\b/g;

function normalize(text: string): string {
  return (
    text
      // "C.G.P.A." and "G.P.A." are common on Indian postings and would
      // otherwise defeat the word-boundary match below.
      .replace(/\bc\.\s?g\.\s?p\.\s?a\.?/gi, "CGPA")
      .replace(/\bg\.\s?p\.\s?a\.?/gi, "GPA")
      .replace(/&nbsp;?/gi, " ")
      .replace(/[ \t]+/g, " ")
  );
}

function clean(line: string): string {
  const trimmed = line.replace(/^[\s\-–—*•·]+/, "").trim();
  return trimmed.length > EVIDENCE_MAX_LENGTH
    ? `${trimmed.slice(0, EVIDENCE_MAX_LENGTH).trimEnd()}…`
    : trimmed;
}

function strictnessFor(line: string, before: string): BarStrictness {
  if (SOFT_MARKER.test(line)) return "soft";
  if (HARD_MARKER.test(line)) return "hard";
  if (HARD_MARKER.test(before.slice(-CONTEXT_WINDOW))) return "hard";
  // Nothing marks it either way, so it only warns. A missed block is cheaper
  // than a wrong one.
  return "soft";
}

/** The nearest short heading above this line, quoted verbatim, or null. */
function headingFor(lines: string[], index: number): string | null {
  for (let i = index - 1; i >= 0 && i >= index - 4; i -= 1) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    if (candidate.length <= HEADING_MAX_LENGTH && HEADING_MARKER.test(candidate)) {
      return clean(candidate);
    }
    return null;
  }
  return null;
}

function nearestGrade(line: string, keywordIndex: number): number | null {
  let best: { value: number; distance: number } | null = null;
  for (const match of line.matchAll(GRADE_NUMBER)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0 || value > 10) continue;
    const distance = Math.abs((match.index ?? 0) - keywordIndex);
    if (distance > GRADE_NEAR) continue;
    if (!best || distance < best.distance) best = { value, distance };
  }
  return best?.value ?? null;
}

function scaleFor(line: string, min: number): 10 | 4 | null {
  if (SCALE_10.test(line)) return 10;
  if (SCALE_4.test(line)) return 4;
  // A 4-point scale cannot require more than 4, so anything above it is a
  // 10-point scale. At or below 4 the two are indistinguishable and the bar is
  // dropped rather than guessed.
  if (min > 4) return 10;
  return null;
}

function cgpaBar(line: string, before: string, heading: string | null): EligibilityBar | null {
  const keyword = CGPA_KEYWORD.exec(line);
  if (!keyword) return null;
  const min = nearestGrade(line, keyword.index);
  if (min === null) return null;
  const scale = scaleFor(line, min);
  if (scale === null) return null;
  return {
    kind: "cgpa",
    min,
    scale,
    strictness: strictnessFor(line, before),
    evidence: clean(line),
    context: heading,
  };
}

function percentageBar(line: string, before: string, heading: string | null): EligibilityBar | null {
  if (PERCENT_EXCLUDE.test(line)) return null;
  const match = PERCENT_NUMBER.exec(line);
  const min = match ? Number(match[1]) : FIRST_CLASS.test(line) ? FIRST_CLASS_PERCENT : null;
  if (min === null || !Number.isFinite(min) || min <= 0 || min > 100) return null;
  if (!PERCENT_CONTEXT.test(line) && !FIRST_CLASS.test(line)) return null;
  return {
    kind: "percentage",
    min,
    strictness: strictnessFor(line, before),
    evidence: clean(line),
    context: heading,
  };
}

function graduationBar(line: string, before: string, heading: string | null): EligibilityBar | null {
  if (!GRAD_CONTEXT.test(line)) return null;
  const years = [...new Set([...line.matchAll(YEAR)].map((match) => Number(match[1])))].sort();
  if (years.length === 0) return null;
  return {
    kind: "graduation-year",
    years,
    strictness: strictnessFor(line, before),
    evidence: clean(line),
    context: heading,
  };
}

/** Keeps one bar per kind, preferring a hard one over a soft one. */
function dedupe(bars: EligibilityBar[]): EligibilityBar[] {
  const byKind = new Map<string, EligibilityBar>();
  for (const bar of bars) {
    const existing = byKind.get(bar.kind);
    if (!existing || (existing.strictness === "soft" && bar.strictness === "hard")) {
      byKind.set(bar.kind, bar);
    }
  }
  return [...byKind.values()];
}

/**
 * Pass the untruncated description. The eligibility section often sits near the
 * end of a long posting, well past the point the stored copy is cut off.
 */
export function extractEligibilityBars(description: string): EligibilityBar[] {
  if (!description) return [];
  const lines = normalize(description).split(/\n+/);
  const bars: EligibilityBar[] = [];
  let before = "";

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed) {
      const heading = headingFor(lines, index);
      const found = [
        cgpaBar(trimmed, before, heading),
        percentageBar(trimmed, before, heading),
        graduationBar(trimmed, before, heading),
      ];
      for (const bar of found) if (bar) bars.push(bar);
    }
    before = `${before}\n${line}`.slice(-CONTEXT_WINDOW * 2);
  });

  return dedupe(bars);
}
