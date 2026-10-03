import type { Profile } from "@/lib/profile-schema";

import { findSkills, type SkillFamily } from "./skills";

/**
 * Where in the resume a skill was found. Anything listed in a skill group or a
 * project stack is treated as declared; anything only mentioned in prose is
 * treated as supporting evidence.
 */
export type ResumeSkill = {
  id: string;
  label: string;
  family: SkillFamily;
  /** 2 when declared in a skill group or project stack, 1 when only in prose. */
  strength: 1 | 2;
  /** Human-readable places in the resume that mention it. */
  evidence: string[];
};

export type ResumeSkillIndex = {
  byId: Map<string, ResumeSkill>;
  /** Skills declared outright, used as the yardstick for how deep a match is. */
  declaredCount: number;
};

type Section = { label: string; text: string; declared: boolean };

function profileSections(profile: Profile): Section[] {
  const sections: Section[] = [];

  if (profile.summary) {
    sections.push({ label: "Summary", text: profile.summary, declared: false });
  }

  for (const group of profile.skillGroups) {
    if (group.skills.length === 0) continue;
    sections.push({
      label: `${group.label} skills`,
      text: group.skills.join(", "),
      declared: true,
    });
  }

  for (const role of profile.experience) {
    sections.push({
      label: `${role.role} at ${role.organization}`.trim(),
      text: [role.role, ...role.bullets].join(". "),
      declared: false,
    });
  }

  for (const project of profile.projects) {
    if (project.stack.length > 0) {
      sections.push({
        label: `${project.name} stack`,
        text: project.stack.join(", "),
        declared: true,
      });
    }
    sections.push({
      label: project.name,
      text: project.bullets.join(". "),
      declared: false,
    });
  }

  for (const entry of profile.education) {
    if (entry.coursework.length > 0) {
      sections.push({
        label: "Coursework",
        text: entry.coursework.join(", "),
        declared: false,
      });
    }
  }

  if (profile.achievements.length > 0) {
    sections.push({
      label: "Achievements",
      text: profile.achievements.join(". "),
      declared: false,
    });
  }

  return sections;
}

/**
 * Reads the resume and nothing else. The job posting never contributes here,
 * which is what keeps a missing requirement from being mistaken for a skill
 * he already has.
 */
export function extractResumeSkills(profile: Profile): ResumeSkillIndex {
  const byId = new Map<string, ResumeSkill>();

  for (const section of profileSections(profile)) {
    for (const hit of findSkills(section.text).values()) {
      const existing = byId.get(hit.id);
      if (existing) {
        if (section.declared) existing.strength = 2;
        if (!existing.evidence.includes(section.label)) {
          existing.evidence.push(section.label);
        }
        continue;
      }
      byId.set(hit.id, {
        id: hit.id,
        label: hit.label,
        family: hit.family,
        strength: section.declared ? 2 : 1,
        evidence: [section.label],
      });
    }
  }

  let declaredCount = 0;
  for (const skill of byId.values()) {
    if (skill.strength === 2) declaredCount += 1;
  }

  return { byId, declaredCount };
}
