import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/activity/types";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<JobStatus, string> = {
  new: "border-border bg-muted text-muted-foreground",
  saved: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "resume-ready": "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  applied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  skipped: "border-border bg-transparent text-muted-foreground line-through",
};

export function StatusBadge({
  status,
  className,
}: {
  status: JobStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
