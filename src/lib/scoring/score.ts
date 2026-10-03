import type { Profile } from "@/lib/profile-schema";

import type { ResumeSkillIndex } from "./resume-skills";
import { findSkills, type SkillHit } from "./skills";
import {
  ROLE_FAMILY_LABELS,
  SCORE_MAXIMUMS,
  type GapSkill,
  type JobScore,
  type MatchedSkill,
  type RoleFamily,
  type ScoreComponent,
} from "./types";

/* ----------------------------- title patterns ----------------------------- */

const TITLE_INTERN = /\b(intern|interns|internship|co.?op|summer analyst)\b/i;
const TITLE_NEW_GRAD =
  /\b(new.?grad|graduate (?:engineer|developer|programme|program|scheme)|campus|trainee|apprentice|fresher)\b/i;
// The trailing form catches "Frontend Engineer I" and "SDE-1" alike, so the
// level is read regardless of which word comes before it.
const TITLE_JUNIOR =
  /\b(junior|jr\.?|entry.?level|early career|(?:sde|swe|engineer|developer|programmer)\s*[-,]?\s*(?:1|i)\b)/i;
const TITLE_ASSOCIATE = /\bassociate\b/i;
const DESCRIPTION_EARLY_CAREER =
  /\b(new grad|recent graduate|final year|graduating in|campus hire|entry.level|fresher|internship program|0\s*[-–to]+\s*[12]\s*years?)\b/i;

const TITLE_FULLSTACK = /\bfull.?stack\b/i;
const TITLE_FRONTEND = /\b(front.?end|ui engineer|ui developer|web developer|client.?side)\b/i;
const TITLE_BACKEND =
  /\b(back.?end|server.?side|api engineer|platform engineer|infrastructure engineer|systems engineer)\b/i;
const TITLE_AI =
  /\b(ai|ml|machine learning|deep learning|nlp|llm|gen.?ai|applied scientist|data scientist|research engineer)\b/i;

/**
 * Titles that point away from the work his resume supports. These never remove
 * a posting, they only pull the score down, so a borderline role stays visible.
 */
const OFF_TARGET_TITLES: { id: string; label: string; pattern: RegExp; penalty: number }[] = [
  {
    id: "non-engineering",
    label: "not a software engineering role",
    pattern: /\b(sales|marketing|recruit\w*|customer success|account executive|business development)\b/i,
    penalty: 30,
  },
  {
    id: "mobile",
    label: "mobile-only",
    pattern: /\b(android|ios|mobile|react native|flutter|swift|kotlin)\b/i,
    penalty: 18,
  },
  {
    id: "devops",
    label: "infrastructure-only",
    pattern: /\b(devops|sre|site reliability|infrastructure|platform engineer|cloud engineer|network engineer)\b/i,
    penalty: 18,
  },
  {
    id: "qa",
    label: "QA-only",
    pattern: /\b(qa|quality assurance|test engineer|sdet|automation tester)\b/i,
    penalty: 14,
  },
  {
    id: "data-engineering",
    label: "data-engineering-only",
    pattern: /\b(data engineer|etl developer|data warehouse|business intelligence)\b/i,
    penalty: 12,
  },
  {
    id: "embedded",
    label: "embedded or hardware-focused",
    pattern: /\b(embedded|firmware|fpga|vlsi|rtl|hardware)\b/i,
    penalty: 16,
  },
];

/* -------------------------------- helpers -------------------------------- */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function listOut(items: string[], limit = 3): string {
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  if (shown.length === 0) return "";
  const joined =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return rest > 0 ? `${joined}, plus ${rest} more` : joined;
}

function preferredFamilies(profile: Profile): Set<RoleFamily> {
  const preferred = new Set<RoleFamily>();
  for (const entry of profile.preferences.roleFunctions) {
    const text = entry.toLowerCase();
    if (/full.?stack/.test(text)) preferred.add("full-stack");
    if (/back.?end/.test(text)) preferred.add("backend");
    if (/front.?end/.test(text)) preferred.add("frontend");
    if (/\bai\b|machine learning|\bml\b|applied.ai/.test(text)) {
      preferred.add("ai-application");
    }
  }
  return preferred;
}

function classifyFamilies(title: string, demanded: Map<string, SkillHit>): RoleFamily[] {
  let frontendSkills = 0;
  let backendSkills = 0;
  let aiSkills = 0;
  for (const hit of demanded.values()) {
    if (hit.family === "frontend") frontendSkills += 1;
    if (hit.family === "backend" || hit.family === "database") backendSkills += 1;
    if (hit.family === "ai") aiSkills += 1;
  }

  const frontend = TITLE_FRONTEND.test(title) || frontendSkills >= 2;
  const backend = TITLE_BACKEND.test(title) || backendSkills >= 2;
  const ai = TITLE_AI.test(title) || aiSkills >= 2;

  let primary: RoleFamily;
  if (TITLE_FULLSTACK.test(title)) primary = "full-stack";
  else if (TITLE_FRONTEND.test(title)) primary = "frontend";
  else if (TITLE_BACKEND.test(title)) primary = "backend";
  else if (TITLE_AI.test(title)) primary = "ai-application";
  else if (frontend && backend) primary = "full-stack";
  else if (ai) primary = "ai-application";
  else if (backend) primary = "backend";
  else if (frontend) primary = "frontend";
  else primary = "other-software";

  const families = new Set<RoleFamily>([primary]);
  if (frontend && backend) families.add("full-stack");
  if (backend) families.add("backend");
  if (frontend) families.add("frontend");
  if (ai) families.add("ai-application");
  if (families.size > 1) families.delete("other-software");

  return [primary, ...[...families].filter((family) => family !== primary)];
}

type Seniority = { points: number; label: string; detail: string };

function classifySeniorityWeight(title: string, description: string): Seniority {
  if (TITLE_INTERN.test(title)) {
    return {
      points: 22,
      label: "Internship",
      detail: "The title is an internship, which is exactly what he is looking for.",
    };
  }
  if (TITLE_NEW_GRAD.test(title)) {
    return {
      points: 22,
      label: "New grad or graduate programme",
      detail: "The title is a new-grad or graduate role, which fits a 2027 graduate.",
    };
  }
  if (TITLE_JUNIOR.test(title)) {
    return {
      points: 20,
      label: "Junior or SDE-1",
      detail: "The title is a junior or SDE-1 level role.",
    };
  }
  if (TITLE_ASSOCIATE.test(title)) {
    return {
      points: 15,
      label: "Associate",
      detail: "The title is an associate role, which is usually a step above entry level.",
    };
  }
  if (DESCRIPTION_EARLY_CAREER.test(description)) {
    return {
      points: 11,
      label: "Early-career signal in the description",
      detail:
        "The title is not explicitly entry level, but the description asks for early-career candidates.",
    };
  }
  return {
    points: 6,
    label: "Level not stated",
    detail:
      "Nothing in the title or description names an entry-level audience, so this may still be pitched above him.",
  };
}

/* --------------------------------- scoring -------------------------------- */

/** Declared resume skills a posting must hit before stack depth tops out. */
const DEPTH_TARGET = 6;

/** Technologies a posting must name before its match ratio is trusted fully. */
const CONFIDENT_AT = 4;

export function scoreJob(
  job: { title: string; description: string },
  resume: ResumeSkillIndex,
  profile: Profile,
): JobScore {
  const title = job.title ?? "";
  const description = job.description ?? "";

  const titleHits = findSkills(title);
  const demanded = findSkills(`${title}\n${description}`);

  const importanceOf = (id: string) => (titleHits.has(id) ? 2 : 1);

  const matched: MatchedSkill[] = [];
  const gaps: GapSkill[] = [];
  let matchedWeight = 0;
  let totalWeight = 0;
  let declaredMatches = 0;

  for (const hit of demanded.values()) {
    const weight = importanceOf(hit.id);
    totalWeight += weight;
    const owned = resume.byId.get(hit.id);
    if (owned) {
      matchedWeight += weight;
      if (owned.strength === 2) declaredMatches += 1;
      matched.push({
        id: hit.id,
        label: hit.label,
        inTitle: titleHits.has(hit.id),
        evidence: owned.evidence,
      });
    } else {
      gaps.push({
        id: hit.id,
        label: hit.label,
        inTitle: titleHits.has(hit.id),
        note: titleHits.has(hit.id)
          ? `${hit.label} is named in the job title and is not on his resume.`
          : `${hit.label} is asked for in the description and is not on his resume.`,
      });
    }
  }

  const rank = (a: { inTitle: boolean; label: string }, b: { inTitle: boolean; label: string }) =>
    Number(b.inTitle) - Number(a.inTitle) || a.label.localeCompare(b.label);
  matched.sort(rank);
  gaps.sort(rank);

  const coverage = totalWeight === 0 ? 0 : matchedWeight / totalWeight;
  const depth = Math.min(declaredMatches / DEPTH_TARGET, 1);
  // A posting that names one technology should not earn full marks for
  // matching it. Thin postings get a proportionally smaller share of the
  // coverage term rather than a misleading perfect ratio.
  const confidence = Math.min(demanded.size / CONFIDENT_AT, 1);
  const stackPoints = SCORE_MAXIMUMS.stack * (0.6 * coverage * confidence + 0.4 * depth);

  const seniority = classifySeniorityWeight(title, description);
  const families = classifyFamilies(title, demanded);

  const offTarget = OFF_TARGET_TITLES.find(
    (candidate) => candidate.pattern.test(title) && declaredMatches < 3,
  );

  const preferred = preferredFamilies(profile);
  const matchesPreference = families.some((family) => preferred.has(family));

  const primary = families[0];

  let familyPoints: number;
  let familyDetail: string;
  if (offTarget) {
    familyPoints = 4;
    familyDetail = `This reads as ${offTarget.label}, which is not the kind of work his resume supports.`;
  } else if (matchesPreference) {
    // Both of his projects are full-stack, so that reads strongest. The
    // sentence always names the role's own primary family, never a secondary
    // one it merely touches.
    familyPoints = primary === "full-stack" ? SCORE_MAXIMUMS.roleFamily : 21;
    const alsoPreferred = families
      .slice(1)
      .filter((family) => preferred.has(family))
      .map((family) => ROLE_FAMILY_LABELS[family].toLowerCase());
    familyDetail =
      alsoPreferred.length > 0
        ? `${ROLE_FAMILY_LABELS[primary]} work with ${listOut(alsoPreferred)} in it, which his projects cover.`
        : `${ROLE_FAMILY_LABELS[primary]} work, which matches his projects and the preferences saved on his profile.`;
  } else if (primary === "other-software") {
    familyPoints = 11;
    familyDetail =
      "General software engineering. Nothing in the posting points at a specific stack he has built in.";
  } else {
    familyPoints = 8;
    familyDetail = "This role family is not in his saved preferences.";
  }

  const titleGaps = gaps.filter((gap) => gap.inTitle);
  let gapPenalty = Math.min(titleGaps.length * 6, 18);
  if (gaps.length >= 8) gapPenalty += 7;
  else if (gaps.length >= 5) gapPenalty += 4;
  gapPenalty = Math.min(gapPenalty, 25);

  let offTargetPenalty = offTarget?.penalty ?? 0;
  if (!offTarget && demanded.size >= 4 && coverage < 0.15) {
    offTargetPenalty = 12;
  }
  offTargetPenalty = Math.min(offTargetPenalty, 30);

  const score = clamp(
    Math.round(stackPoints + seniority.points + familyPoints - gapPenalty - offTargetPenalty),
    0,
    100,
  );

  const components: ScoreComponent[] = [
    {
      id: "stack",
      label: "Stack overlap",
      points: Math.round(stackPoints),
      max: SCORE_MAXIMUMS.stack,
      detail:
        matched.length > 0
          ? `Shares ${matched.length} of the ${demanded.size} technologies this posting names, including ${listOut(matched.map((skill) => skill.label))}.`
          : demanded.size > 0
            ? `None of the ${demanded.size} technologies this posting names appear on his resume.`
            : "The posting does not name any specific technology, so there is nothing to match against.",
    },
    {
      id: "early-career",
      label: "Early-career fit",
      points: seniority.points,
      max: SCORE_MAXIMUMS.earlyCareer,
      detail: seniority.detail,
    },
    {
      id: "role-family",
      label: "Role family",
      points: familyPoints,
      max: SCORE_MAXIMUMS.roleFamily,
      detail: familyDetail,
    },
  ];

  if (gapPenalty > 0) {
    components.push({
      id: "gaps",
      label: "Missing requirements",
      points: -gapPenalty,
      max: null,
      detail:
        titleGaps.length > 0
          ? `The posting is built around ${listOut(titleGaps.map((gap) => gap.label))}, which he has not used. ${gaps.length} requirement${gaps.length === 1 ? " is" : "s are"} missing in total.`
          : `${gaps.length} requirements in the description are missing from his resume.`,
    });
  }

  if (offTargetPenalty > 0) {
    components.push({
      id: "off-target",
      label: "Off-target role",
      points: -offTargetPenalty,
      max: null,
      detail: offTarget
        ? `The title reads as ${offTarget.label}. It is kept here because it passed the junior filter, but it is a poor fit.`
        : "Almost nothing in this posting's stack overlaps his experience.",
    });
  }

  const verdict =
    score >= 75
      ? "Strong match"
      : score >= 55
        ? "Worth a look"
        : score >= 35
          ? "Weak match"
          : "Poor match";

  const headline =
    matched.length > 0
      ? `${verdict.toLowerCase()} on ${listOut(matched.map((skill) => skill.label), 3)}`
      : `${verdict.toLowerCase()}, no overlapping technology`;

  return {
    score,
    verdict,
    headline,
    components,
    matched,
    gaps,
    families,
    seniorityLabel: seniority.label,
  };
}
