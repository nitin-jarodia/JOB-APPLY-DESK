import { CircleAlertIcon, CircleHelpIcon, OctagonXIcon } from "lucide-react";

import type { Eligibility, EligibilityOutcome } from "@/lib/eligibility/types";
import { cn } from "@/lib/utils";

const OUTCOME_HEADING: Record<Exclude<EligibilityOutcome, "met">, string> = {
  blocked: "You do not meet a stated requirement",
  warn: "Worth checking before you spend time on this",
  unverified: "Stated requirements this desk could not check",
};

const OUTCOME_LEAD: Record<Exclude<EligibilityOutcome, "met">, string> = {
  blocked:
    "The posting states this as a condition of applying, and your saved profile does not meet it.",
  unverified:
    "The posting states these, but your profile has nothing comparable saved, so no claim is made either way. Read them yourself.",
  warn: "The posting words this as a preference rather than a condition, so it does not rule you out.",
};

const OUTCOME_CLASS: Record<Exclude<EligibilityOutcome, "met">, string> = {
  blocked:
    "border-destructive/40 bg-destructive/5 text-destructive dark:border-destructive/50 dark:text-red-300",
  warn: "border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300",
  unverified: "border-border bg-muted/40 text-muted-foreground",
};

const OUTCOME_ICON = {
  blocked: OctagonXIcon,
  warn: CircleAlertIcon,
  unverified: CircleHelpIcon,
} as const;

/** Compact marker for a job card, where only a hard block is worth the space. */
export function EligibilityBadge({
  eligibility,
  className,
}: {
  eligibility: Eligibility;
  className?: string;
}) {
  if (!eligibility.blocked) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300",
        className,
      )}
    >
      <OctagonXIcon className="size-3.5 shrink-0" aria-hidden />
      Not eligible
    </span>
  );
}

/**
 * The full panel. Every requirement is shown with the posting's own line
 * underneath it, because a bar stated without its source is just this app's
 * opinion about his chances.
 */
export function EligibilityNotice({ eligibility }: { eligibility: Eligibility }) {
  const shown = eligibility.findings.filter((finding) => finding.outcome !== "met");
  if (shown.length === 0) return null;

  const groups = (["blocked", "warn", "unverified"] as const)
    .map((outcome) => ({
      outcome,
      findings: shown.filter((finding) => finding.outcome === outcome),
    }))
    .filter((group) => group.findings.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const Icon = OUTCOME_ICON[group.outcome];
        return (
          <section
            key={group.outcome}
            className={cn("rounded-lg border p-3", OUTCOME_CLASS[group.outcome])}
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="size-4 shrink-0" aria-hidden />
              {OUTCOME_HEADING[group.outcome]}
            </h3>
            <p className="mt-1 text-xs opacity-90">{OUTCOME_LEAD[group.outcome]}</p>
            <ul className="mt-2.5 flex flex-col gap-2.5">
              {group.findings.map((finding, index) => (
                <li key={`${finding.bar.kind}-${index}`} className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{finding.note}</span>
                  <blockquote className="border-l-2 border-current/30 pl-2.5 text-xs opacity-85">
                    {finding.bar.context ? (
                      <span className="mb-0.5 block font-medium">
                        Under &ldquo;{finding.bar.context}&rdquo;
                      </span>
                    ) : null}
                    &ldquo;{finding.bar.evidence}&rdquo;
                  </blockquote>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
