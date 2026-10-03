import { z } from "zod";

import { jobsSnapshotSchema, normalizedJobSchema } from "@/lib/jobs/types";

export const ROLE_FAMILIES = [
  "full-stack",
  "backend",
  "frontend",
  "ai-application",
  "other-software",
] as const;

export type RoleFamily = (typeof ROLE_FAMILIES)[number];

export const ROLE_FAMILY_LABELS: Record<RoleFamily, string> = {
  "full-stack": "Full-stack",
  backend: "Backend",
  frontend: "Frontend",
  "ai-application": "AI application",
  "other-software": "General software",
};

/** Filter choices on the jobs page. "any" means no role-family constraint. */
export const ROLE_FAMILY_FILTERS = [
  { value: "any", label: "Any software role" },
  { value: "full-stack", label: "Full-stack" },
  { value: "backend", label: "Backend" },
  { value: "frontend", label: "Frontend" },
  { value: "ai-application", label: "AI application" },
] as const;

export const matchedSkillSchema = z.object({
  id: z.string(),
  label: z.string(),
  inTitle: z.boolean(),
  /** Where this shows up on the resume, so a match can be justified. */
  evidence: z.array(z.string()),
});

export const gapSkillSchema = z.object({
  id: z.string(),
  label: z.string(),
  inTitle: z.boolean(),
  /** Plain-language note. Always phrased as something he does not have. */
  note: z.string(),
});

export const scoreComponentSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** Signed. Penalties are negative. */
  points: z.number(),
  /** Null for penalties, which have no natural ceiling to show. */
  max: z.number().nullable(),
  detail: z.string(),
});

export const jobScoreSchema = z.object({
  score: z.number(),
  verdict: z.string(),
  headline: z.string(),
  components: z.array(scoreComponentSchema),
  matched: z.array(matchedSkillSchema),
  gaps: z.array(gapSkillSchema),
  families: z.array(z.enum(ROLE_FAMILIES)),
  seniorityLabel: z.string(),
});

export const scoredJobSchema = normalizedJobSchema.extend({
  /** URL-safe stand-in for `id`, which can contain slashes. */
  slug: z.string(),
  scoring: jobScoreSchema,
});

/** The cached snapshot with every job scored against the current resume. */
export const scoredSnapshotSchema = jobsSnapshotSchema.extend({
  jobs: z.array(scoredJobSchema),
});

export type ScoredSnapshot = z.infer<typeof scoredSnapshotSchema>;
export type MatchedSkill = z.infer<typeof matchedSkillSchema>;
export type GapSkill = z.infer<typeof gapSkillSchema>;
export type ScoreComponent = z.infer<typeof scoreComponentSchema>;
export type JobScore = z.infer<typeof jobScoreSchema>;
export type ScoredJob = z.infer<typeof scoredJobSchema>;

export const SCORE_MAXIMUMS = {
  stack: 55,
  earlyCareer: 22,
  roleFamily: 23,
} as const;
