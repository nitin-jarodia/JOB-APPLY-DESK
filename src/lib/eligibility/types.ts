import { z } from "zod";

/**
 * A numeric bar the posting states, such as "CGPA 8 and above".
 *
 * Bars are extracted from the description at fetch time but compared against
 * the profile at scoring time. Splitting it that way means the scan can read
 * the full text before it is truncated, while correcting a CGPA on the profile
 * page still re-decides eligibility without refetching every board.
 */

export const BAR_STRICTNESS = ["hard", "soft"] as const;
export type BarStrictness = (typeof BAR_STRICTNESS)[number];

const common = {
  /** "hard" blocks, "soft" only warns. Anything unmarked is treated as soft. */
  strictness: z.enum(BAR_STRICTNESS),
  /** The posting's own line. No bar is ever displayed without it. */
  evidence: z.string(),
  /**
   * The heading the line sat under, quoted separately rather than spliced into
   * `evidence`, so both stay verbatim.
   */
  context: z.string().nullable(),
};

export const eligibilityBarSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cgpa"),
    min: z.number(),
    /** Only 10 and 4 are stored. An unclear scale drops the bar at parse time. */
    scale: z.union([z.literal(10), z.literal(4)]),
    ...common,
  }),
  z.object({
    kind: z.literal("percentage"),
    min: z.number(),
    ...common,
  }),
  z.object({
    kind: z.literal("graduation-year"),
    years: z.array(z.number().int()),
    ...common,
  }),
]);

/**
 * - `blocked`  a hard bar was compared and failed
 * - `warn`     a soft bar was compared and failed, or a hard bar he cannot meet
 *              that was only implied rather than stated as mandatory
 * - `unverified` the posting states a bar but the profile has nothing
 *              comparable, so no claim is made either way
 * - `met`      compared and satisfied
 */
export const ELIGIBILITY_OUTCOMES = ["blocked", "warn", "unverified", "met"] as const;
export type EligibilityOutcome = (typeof ELIGIBILITY_OUTCOMES)[number];

export const eligibilityFindingSchema = z.object({
  bar: eligibilityBarSchema,
  outcome: z.enum(ELIGIBILITY_OUTCOMES),
  /** Plain sentence naming the requirement and the profile value it was read against. */
  note: z.string(),
});

export const eligibilitySchema = z.object({
  /** True only when a hard bar was compared against a real profile value and failed. */
  blocked: z.boolean(),
  findings: z.array(eligibilityFindingSchema),
});

export type EligibilityBar = z.infer<typeof eligibilityBarSchema>;
export type EligibilityFinding = z.infer<typeof eligibilityFindingSchema>;
export type Eligibility = z.infer<typeof eligibilitySchema>;

export const EMPTY_ELIGIBILITY: Eligibility = { blocked: false, findings: [] };
