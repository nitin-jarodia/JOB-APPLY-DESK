import { cn } from "@/lib/utils";

type Band = { min: number; className: string };

const BANDS: Band[] = [
  { min: 75, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { min: 55, className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { min: 35, className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { min: 0, className: "border-border bg-muted text-muted-foreground" },
];

function bandFor(score: number): string {
  return (BANDS.find((band) => score >= band.min) ?? BANDS[BANDS.length - 1]).className;
}

/**
 * A blocked posting scores low enough to land in the neutral band, which reads
 * as "weak" rather than "ruled out". The destructive colour is forced so the
 * reason is not mistaken for a merely poor match.
 */
const INELIGIBLE_CLASS =
  "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300";

export function ScoreBadge({
  score,
  verdict,
  ineligible = false,
  size = "sm",
  className,
}: {
  score: number;
  verdict?: string;
  ineligible?: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border font-medium tabular-nums",
        size === "lg" ? "px-3 py-1.5 text-base" : "px-2 py-0.5 text-xs",
        ineligible ? INELIGIBLE_CLASS : bandFor(score),
        className,
      )}
    >
      <span className={size === "lg" ? "text-2xl leading-none font-semibold" : ""}>{score}</span>
      <span className="sr-only">out of 100</span>
      {verdict ? <span className={size === "lg" ? "" : "font-normal"}>{verdict}</span> : null}
    </span>
  );
}
