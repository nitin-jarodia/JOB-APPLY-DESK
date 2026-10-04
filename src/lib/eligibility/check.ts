import type { Profile } from "@/lib/profile-schema";

import {
  EMPTY_ELIGIBILITY,
  type Eligibility,
  type EligibilityBar,
  type EligibilityFinding,
} from "./types";

/**
 * Compares the bars a posting states against what the profile actually says.
 *
 * Nothing here infers a fact. If the profile does not record a comparable
 * value, the finding comes back `unverified` and the requirement is shown with
 * the posting's own wording so he can judge it, rather than being silently
 * dropped or turned into a block.
 */

const CGPA_IN_SCORE = /\b(?:cgpa|gpa|grade point average)\b[^0-9]{0,12}(\d{1,2}(?:\.\d{1,3})?)/i;
const SCORE_SCALE = /\/\s*(10|4)\b|out of (10|4)\b/i;
const PERCENT_IN_SCORE = /(\d{2}(?:\.\d+)?)\s*%/;

type ResumeGrade = { value: number; scale: 10 | 4 } | null;

/** The CGPA as typed on the profile, e.g. "CGPA: 6.73/10". */
function resumeCgpa(profile: Profile): ResumeGrade {
  for (const entry of profile.education) {
    const text = entry.score ?? "";
    const match = CGPA_IN_SCORE.exec(text);
    if (!match) continue;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0 || value > 10) continue;
    const scaleMatch = SCORE_SCALE.exec(text);
    const scale = scaleMatch ? (Number(scaleMatch[1] ?? scaleMatch[2]) as 10 | 4) : value > 4 ? 10 : null;
    if (scale === null) continue;
    return { value, scale };
  }
  return null;
}

function resumePercentage(profile: Profile): number | null {
  for (const entry of profile.education) {
    const match = PERCENT_IN_SCORE.exec(entry.score ?? "");
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 100) return value;
  }
  return null;
}

/**
 * The graduation year he saved in preferences, falling back to the end of an
 * education period. Both are values he typed; neither is inferred.
 */
function resumeGraduationYear(profile: Profile): number | null {
  const stated = /\b(20[2-3]\d)\b/.exec(profile.preferences.graduationYear ?? "");
  if (stated) return Number(stated[1]);
  for (const entry of profile.education) {
    const years = [...(entry.period ?? "").matchAll(/\b(20[2-3]\d)\b/g)].map((m) => Number(m[1]));
    if (years.length > 0) return Math.max(...years);
  }
  return null;
}

function describeGrade(grade: { value: number; scale: 10 | 4 }): string {
  return `${grade.value}/${grade.scale}`;
}

function fail(bar: EligibilityBar, note: string): EligibilityFinding {
  // A soft bar never blocks, however far short he falls.
  return { bar, outcome: bar.strictness === "hard" ? "blocked" : "warn", note };
}

function checkBar(bar: EligibilityBar, profile: Profile): EligibilityFinding {
  if (bar.kind === "cgpa") {
    const mine = resumeCgpa(profile);
    if (!mine) {
      return {
        bar,
        outcome: "unverified",
        note: `This posting asks for a CGPA of ${bar.min}/${bar.scale}. Your profile does not record a CGPA, so it could not be checked.`,
      };
    }
    if (mine.scale !== bar.scale) {
      return {
        bar,
        outcome: "unverified",
        note: `This posting asks for ${bar.min}/${bar.scale} and your profile says ${describeGrade(mine)}. Converting between those scales is not standard, so it was left for you to judge.`,
      };
    }
    if (mine.value < bar.min) {
      return fail(
        bar,
        `Asks for CGPA ${bar.min}/${bar.scale}, your resume says ${describeGrade(mine)}.`,
      );
    }
    return {
      bar,
      outcome: "met",
      note: `Asks for CGPA ${bar.min}/${bar.scale}, your resume says ${describeGrade(mine)}.`,
    };
  }

  if (bar.kind === "percentage") {
    const mine = resumePercentage(profile);
    if (mine === null) {
      const cgpa = resumeCgpa(profile);
      return {
        bar,
        outcome: "unverified",
        note: cgpa
          ? `This posting asks for ${bar.min}%. Your profile records ${describeGrade(cgpa)}, and CGPA-to-percentage conversion differs by university, so it could not be checked.`
          : `This posting asks for ${bar.min}%. Your profile does not record a percentage, so it could not be checked.`,
      };
    }
    if (mine < bar.min) {
      return fail(bar, `Asks for ${bar.min}%, your resume says ${mine}%.`);
    }
    return { bar, outcome: "met", note: `Asks for ${bar.min}%, your resume says ${mine}%.` };
  }

  const mine = resumeGraduationYear(profile);
  const years = bar.years.join(" or ");
  if (mine === null) {
    return {
      bar,
      outcome: "unverified",
      note: `This posting is for ${years} graduates. Your profile does not record a graduation year, so it could not be checked.`,
    };
  }
  if (!bar.years.includes(mine)) {
    return fail(bar, `Open to ${years} graduates, you graduate in ${mine}.`);
  }
  return { bar, outcome: "met", note: `Open to ${years} graduates, which matches your ${mine}.` };
}

/** Blocked first, then warnings, then things that could not be checked. */
const ORDER: Record<EligibilityFinding["outcome"], number> = {
  blocked: 0,
  warn: 1,
  unverified: 2,
  met: 3,
};

export function checkEligibility(bars: EligibilityBar[], profile: Profile): Eligibility {
  if (bars.length === 0) return EMPTY_ELIGIBILITY;
  const findings = bars
    .map((bar) => checkBar(bar, profile))
    .sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);
  return {
    blocked: findings.some((finding) => finding.outcome === "blocked"),
    findings,
  };
}
