"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkIcon, CheckCircle2Icon, Loader2Icon, RotateCcwIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/jobs/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { JOB_STATUS_LABELS, type JobActivity, type JobStatus } from "@/lib/activity/types";
import { formatDayTime } from "@/lib/format-date";

const ACTIONS: { status: JobStatus; label: string; icon: typeof BookmarkIcon }[] = [
  { status: "saved", label: "Save for later", icon: BookmarkIcon },
  { status: "applied", label: "I applied", icon: CheckCircle2Icon },
  { status: "skipped", label: "Skip this one", icon: XCircleIcon },
];

export function JobStatusControls({
  slug,
  initialStatus,
  initialAppliedAt,
}: {
  slug: string;
  initialStatus: JobStatus;
  initialAppliedAt: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [appliedAt, setAppliedAt] = useState<string | null>(initialAppliedAt);
  const [pending, setPending] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(next: JobStatus) {
    setPending(next);
    setError(null);
    try {
      const response = await fetch("/api/job-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, status: next }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed with ${response.status}.`);
      }
      const body = (await response.json()) as { entry: JobActivity };
      setStatus(body.entry.status);
      setAppliedAt(body.entry.appliedAt);
      // The badge in the page header and the grouping on the shortlist are
      // both server-rendered, so they need re-rendering with the new status.
      router.refresh();
      toast.success(`Marked as ${JOB_STATUS_LABELS[body.entry.status].toLowerCase()}`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not save the status.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Status</span>
        <StatusBadge status={status} />
        {status === "applied" && appliedAt ? (
          <span className="text-muted-foreground">
            marked on {formatDayTime(appliedAt)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const active = status === action.status;
          return (
            <Button
              key={action.status}
              size="sm"
              variant={active ? "default" : "outline"}
              disabled={pending !== null}
              onClick={() => void update(action.status)}
            >
              {pending === action.status ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <Icon />
              )}
              {action.label}
            </Button>
          );
        })}
        {status !== "new" ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending !== null}
            onClick={() => void update("new")}
          >
            {pending === "new" ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
            Reset
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Nothing here is set by opening the Apply link. Job Apply Desk cannot tell
        whether you finished an application, so only these buttons change the
        status.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
