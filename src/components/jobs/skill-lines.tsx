import type { GapSkill, MatchedSkill } from "@/lib/scoring/types";

/**
 * The two lines carry opposite meanings, so they are worded rather than left
 * as bare chips. A gap is always phrased as something the resume lacks.
 */
export function SkillLines({
  matched,
  gaps,
  gapLimit = 3,
}: {
  matched: MatchedSkill[];
  gaps: GapSkill[];
  gapLimit?: number;
}) {
  const shownGaps = gaps.slice(0, gapLimit);
  const hiddenGaps = gaps.length - shownGaps.length;

  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <dt className="shrink-0 text-muted-foreground">Overlaps your resume</dt>
        <dd className="flex min-w-0 flex-wrap gap-1">
          {matched.length === 0 ? (
            <span className="text-muted-foreground">nothing</span>
          ) : (
            matched.map((skill) => (
              <span
                key={skill.id}
                className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-700 dark:text-emerald-300"
              >
                {skill.label}
              </span>
            ))
          )}
        </dd>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <dt className="shrink-0 text-muted-foreground">Asks for, you lack</dt>
        <dd className="flex min-w-0 flex-wrap gap-1">
          {shownGaps.length === 0 ? (
            <span className="text-muted-foreground">nothing it names</span>
          ) : (
            <>
              {shownGaps.map((gap) => (
                <span
                  key={gap.id}
                  className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  {gap.label}
                </span>
              ))}
              {hiddenGaps > 0 ? (
                <span className="px-1 py-0.5 text-xs text-muted-foreground">
                  and {hiddenGaps} more
                </span>
              ) : null}
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
