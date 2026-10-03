import { CheckIcon } from "lucide-react";

import { ScoreBadge } from "@/components/jobs/score-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { JobScore } from "@/lib/scoring/types";

function signed(points: number): string {
  return points > 0 ? `+${points}` : String(points);
}

export function ScoreBreakdown({ scoring }: { scoring: JobScore }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How this score was reached</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={scoring.score} verdict={scoring.verdict} size="lg" />
          <p className="text-sm text-muted-foreground">
            Scored out of 100 against your saved resume. Nothing about the
            posting is added to your resume.
          </p>
        </div>

        <Separator />

        <ul className="flex flex-col gap-3">
          {scoring.components.map((component) => (
            <li key={component.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{component.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {signed(component.points)}
                  {component.max !== null ? ` of ${component.max}` : ""}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{component.detail}</p>
            </li>
          ))}
        </ul>

        <Separator />

        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">Total</span>
          <span className="text-sm font-medium tabular-nums">{scoring.score} of 100</span>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h3 className="font-medium">What overlaps your resume</h3>
          {scoring.matched.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing this posting names appears on your resume. That does not
              make it unreachable, but the score reflects the distance.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scoring.matched.map((skill) => (
                <li key={skill.id} className="flex items-start gap-2 text-sm">
                  <CheckIcon
                    className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">{skill.label}</span>
                    {skill.inTitle ? " is in the job title, and is" : " is"} on your
                    resume
                    {skill.evidence.length > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        under {skill.evidence.slice(0, 2).join(" and ")}
                      </span>
                    ) : null}
                    .
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
