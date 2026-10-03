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

export function ScoreBadge({
  score,
  verdict,
  size = "sm",
  className,
}: {
  score: number;
  verdict?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border font-medium tabular-nums",
        size === "lg" ? "px-3 py-1.5 text-base" : "px-2 py-0.5 text-xs",
        bandFor(score),
        className,
      )}
    >
      <span className={size === "lg" ? "text-2xl leading-none font-semibold" : ""}>{score}</span>
      <span className="sr-only">out of 100</span>
      {verdict ? <span className={size === "lg" ? "" : "font-normal"}>{verdict}</span> : null}
    </span>
  );
}
