import { CheckIcon, DatabaseIcon, TriangleAlertIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SourceResult } from "@/lib/jobs/types";

export function SourceStatus({ sources }: { sources: SourceResult[] }) {
  if (sources.length === 0) return null;

  const broken = sources.filter((source) => !source.ok);
  const stale = sources.filter((source) => source.keptStale);
  const degraded = sources.filter(
    (source) => source.ok && source.failedEndpoints.length > 0,
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-sm font-medium">Sources</h2>
          <p className="text-xs text-muted-foreground">
            {broken.length === 0
              ? `All ${sources.length} sources responded`
              : `${broken.length} of ${sources.length} sources failed`}
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {sources.map((source) => (
            <li key={source.source} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {source.ok ? (
                  source.fromCache ? (
                    <DatabaseIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <CheckIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )
                ) : (
                  <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" aria-hidden />
                )}
                <span className="font-medium">{source.label}</span>
                <span className="text-muted-foreground">
                  {source.ok
                    ? `scanned ${source.fetched.toLocaleString()} across ${source.requests} request${source.requests === 1 ? "" : "s"}, kept ${source.kept}`
                    : source.keptStale
                      ? `unavailable, showing ${source.kept} from the last good fetch`
                      : "unavailable"}
                </span>
                {source.fromCache ? (
                  <span className="text-xs text-muted-foreground">(reused from cache)</span>
                ) : null}
              </div>

              {source.source === "remotive" ? (
                <p className="text-xs text-muted-foreground">
                  Remotive listings are delayed by 24 hours. Their rows link back
                  to Remotive and are credited to Remotive as the source.
                </p>
              ) : null}

              {source.error ? (
                <p className="text-sm text-destructive">{source.error}</p>
              ) : null}

              {source.failedEndpoints.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {source.failedEndpoints.map((failure) => (
                    <li key={`${failure.endpoint}-${failure.reason}`}>
                      <span className="text-destructive">skipped</span> {failure.endpoint}: {failure.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>

        {stale.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            A source failing means it could not be asked, not that its postings
            were withdrawn, so{" "}
            {stale.map((source) => source.label).join(", ")} postings from the
            last good fetch are still listed. They may be out of date.
          </p>
        ) : null}

        {degraded.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Skipped endpoints do not stop the rest of a source. Everything above
            was still listed from the endpoints that answered.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
