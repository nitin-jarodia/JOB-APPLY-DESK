import type { Profile } from "@/lib/profile-schema";
import { findSkills } from "@/lib/scoring/skills";
import { ROLE_FAMILY_LABELS, type JobScore } from "@/lib/scoring/types";

import type { ResumeDocument, TailoredResume } from "./types";

/**
 * Tailoring never writes a new fact. Every operation here is one of three
 * things: reorder something, drop something, or replace the summary sentence.
 * Bullet text, skill names, dates, the CGPA, and all contact fields are copied
 * through untouched, which is what makes the output auditable against the
 * master resume.
 */

const STOPWORDS = new Set([
  "and", "the", "for", "with", "you", "our", "will", "are", "that", "this", "from", "have",
  "has", "was", "were", "their", "them", "they", "your", "its", "but", "not", "can", "all",
  "any", "who", "how", "what", "when", "where", "which", "into", "over", "under", "more",
  "most", "other", "such", "than", "then", "there", "these", "those", "some", "also",
  "about", "across", "within", "while", "work", "working", "team", "teams", "role", "roles",
  "job", "jobs", "company", "candidate", "candidates", "experience", "years", "year",
  "including", "include", "includes", "using", "use", "used", "build", "building", "built",
  "help", "helping", "new", "well", "like", "make", "making", "take", "both", "each",
  "per", "via", "etc", "join", "looking", "strong", "good", "great", "ability", "able",
]);

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];
  const out = new Set<string>();
  for (const word of words) {
    const cleaned = word.replace(/^\.+|\.+$/g, "");
    if (cleaned.length < 3) continue;
    if (STOPWORDS.has(cleaned)) continue;
    out.add(cleaned);
  }
  return out;
}

function countShared(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  return shared;
}

function skillIdsIn(text: string): Set<string> {
  return new Set(findSkills(text).keys());
}

function overlapsMatched(text: string, matchedIds: Set<string>): boolean {
  for (const id of skillIdsIn(text)) if (matchedIds.has(id)) return true;
  return false;
}

/** Higher is more relevant. Named skills count for more than loose words. */
function relevance(text: string, matchedIds: Set<string>, postingWords: Set<string>) {
  let skillHits = 0;
  for (const id of skillIdsIn(text)) if (matchedIds.has(id)) skillHits += 1;
  const wordHits = countShared(tokenize(text), postingWords);
  return { skillHits, wordHits, score: skillHits * 3 + wordHits };
}

/** Stable sort: equal relevance keeps the master resume's own order. */
function sortByRelevance<T>(items: T[], scoreOf: (item: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreOf(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

type BulletResult = { kept: string[]; omitted: string[] };

/**
 * Reorders bullets by relevance and may drop a bullet that shares nothing with
 * the posting.
 *
 * Dropping is only allowed when the posting named a technology he actually
 * has. Without that, the only signal left is incidental word overlap, which is
 * too weak a reason to remove real work from a resume, so the entry is kept
 * whole and merely reordered.
 */
function tailorBullets(
  bullets: string[],
  matchedIds: Set<string>,
  postingWords: Set<string>,
  allowOmission: boolean,
): BulletResult {
  if (bullets.length === 0) return { kept: [], omitted: [] };

  const ranked = bullets
    .map((text, index) => ({ text, index, ...relevance(text, matchedIds, postingWords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (!allowOmission || !ranked.some((entry) => entry.score > 0)) {
    return { kept: ranked.map((entry) => entry.text), omitted: [] };
  }

  const kept: string[] = [];
  const omitted: string[] = [];
  for (const entry of ranked) {
    if (entry.score === 0) omitted.push(entry.text);
    else kept.push(entry.text);
  }

  return { kept, omitted };
}

const IIIT_ANCHOR = "Final-year B.Tech student at IIIT Surat";

/** The part of the master summary that must survive the rewrite. */
function leadClause(summary: string): string {
  if (summary.includes(IIIT_ANCHOR)) return IIIT_ANCHOR;
  const firstSentence = summary.split(/(?<=\.)\s/)[0] ?? "";
  const beforeSeeking = firstSentence.split(/\s+seeking\s+/i)[0] ?? "";
  return beforeSeeking.replace(/[.,]\s*$/, "").trim();
}

function familyPhrase(scoring: JobScore): string {
  const primary = scoring.families[0];
  if (primary === "other-software") return "software engineering";
  if (primary === "ai-application") return "AI application";
  return ROLE_FAMILY_LABELS[primary].toLowerCase();
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function tailorResume(
  profile: Profile,
  job: { title: string; description: string },
  scoring: JobScore,
): TailoredResume {
  const matchedIds = new Set(scoring.matched.map((skill) => skill.id));
  const postingWords = tokenize(`${job.title} ${job.description}`);
  const allowOmission = matchedIds.size > 0;

  /* ------------------------------- skills -------------------------------- */

  const highlighted: string[] = [];
  const groupOverlap = new Map<string, number>();
  const skillGroups = profile.skillGroups.map((group) => {
    const overlapping: string[] = [];
    const rest: string[] = [];
    for (const skill of group.skills) {
      if (overlapsMatched(skill, matchedIds)) {
        overlapping.push(skill);
        highlighted.push(skill);
      } else {
        rest.push(skill);
      }
    }
    groupOverlap.set(group.id, overlapping.length);
    // Every real skill survives; only the order changes.
    return { ...group, skills: [...overlapping, ...rest] };
  });

  const orderedGroups = sortByRelevance(
    skillGroups,
    (group) => groupOverlap.get(group.id) ?? 0,
  );

  /* ----------------------------- experience ------------------------------ */

  const omittedBullets: { source: string; text: string }[] = [];

  // Entry order is left alone so the resume stays chronological. Only the
  // bullets inside an entry are reordered.
  const experience = profile.experience.map((entry) => {
    const { kept, omitted } = tailorBullets(
      entry.bullets,
      matchedIds,
      postingWords,
      allowOmission,
    );
    for (const text of omitted) {
      omittedBullets.push({ source: `${entry.role} at ${entry.organization}`, text });
    }
    return { ...entry, bullets: kept };
  });

  /* ------------------------------ projects ------------------------------- */

  const projects = sortByRelevance(
    profile.projects.map((project) => {
      const { kept, omitted } = tailorBullets(
        project.bullets,
        matchedIds,
        postingWords,
        allowOmission,
      );
      for (const text of omitted) omittedBullets.push({ source: project.name, text });
      const stack = [
        ...project.stack.filter((item) => overlapsMatched(item, matchedIds)),
        ...project.stack.filter((item) => !overlapsMatched(item, matchedIds)),
      ];
      return { ...project, stack, bullets: kept };
    }),
    (project) =>
      relevance(
        `${project.name} ${project.stack.join(" ")} ${project.bullets.join(" ")}`,
        matchedIds,
        postingWords,
      ).score,
  );

  /* ------------------------------- summary ------------------------------- */

  // Only technologies that already appear in the resume's own skill lists can
  // be named here, so the sentence cannot introduce a tool he has not used.
  const resumeSkillStrings = profile.skillGroups.flatMap((group) => group.skills);
  const summaryTechnologies = (
    highlighted.length > 0 ? highlighted : resumeSkillStrings
  ).slice(0, 6);

  const lead = leadClause(profile.summary);
  const family = familyPhrase(scoring);
  const technologyClause =
    summaryTechnologies.length > 0
      ? `, with hands-on work in ${joinList(summaryTechnologies)}`
      : "";
  const summary = lead
    ? `${lead} targeting ${family} roles${technologyClause}.`
    : `Targeting ${family} roles${technologyClause}.`.trim();

  const document: ResumeDocument = {
    contact: { ...profile.contact },
    summary,
    skillGroups: orderedGroups,
    experience,
    projects,
    education: profile.education.map((entry) => ({ ...entry })),
    achievements: [...profile.achievements],
  };

  return {
    document,
    notes: {
      roleFamilyLabel: ROLE_FAMILY_LABELS[scoring.families[0]],
      highlighted,
      omittedBullets,
      summaryTechnologies,
    },
  };
}

/** The master resume rendered in the same shape, for the side-by-side view. */
export function masterDocument(profile: Profile): ResumeDocument {
  return {
    contact: { ...profile.contact },
    summary: profile.summary,
    skillGroups: profile.skillGroups.map((group) => ({ ...group })),
    experience: profile.experience.map((entry) => ({ ...entry })),
    projects: profile.projects.map((project) => ({ ...project })),
    education: profile.education.map((entry) => ({ ...entry })),
    achievements: [...profile.achievements],
  };
}
