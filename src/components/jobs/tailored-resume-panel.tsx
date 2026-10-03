"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileWarningIcon,
  Loader2Icon,
  PrinterIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ResumeView } from "@/components/jobs/resume-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDayTime } from "@/lib/format-date";
import { resumeFileName, resumeToMarkdown, resumeToPlainText } from "@/lib/tailor/render";
import type { ResumeDocument, TailoredRecord } from "@/lib/tailor/types";

type TailoredResponse = {
  record?: TailoredRecord;
  master?: ResumeDocument;
  stale?: boolean;
  statusChanged?: boolean;
  error?: string;
};

type Loaded = {
  record: TailoredRecord;
  master: ResumeDocument;
  stale: boolean;
  /** True when building this resume moved the job to "Resume ready". */
  statusChanged: boolean;
};

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function loadTailored(slug: string): Promise<Loaded> {
  const response = await fetch(`/api/tailored?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response, `Request failed with ${response.status}.`));
  }
  const body = (await response.json()) as TailoredResponse;
  if (!body.record || !body.master) {
    throw new Error("The tailored resume came back empty.");
  }
  return {
    record: body.record,
    master: body.master,
    stale: Boolean(body.stale),
    statusChanged: Boolean(body.statusChanged),
  };
}

function isEmptyResume(document: ResumeDocument): boolean {
  return (
    document.skillGroups.every((group) => group.skills.length === 0) &&
    document.experience.length === 0 &&
    document.projects.length === 0 &&
    document.education.length === 0 &&
    document.achievements.length === 0
  );
}

export function TailoredResumePanel({ slug }: { slug: string }) {
  const router = useRouter();
  const [data, setData] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    loadTailored(slug)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
        // The server just promoted this job to "Resume ready". Re-render the
        // page so the badge above matches, instead of waiting for a reload.
        if (result.statusChanged) router.refresh();
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not reach the local tailoring API.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, attempt, router]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const response = await fetch("/api/tailored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, `Rebuild failed with ${response.status}.`));
      }
      const body = (await response.json()) as TailoredResponse;
      if (!body.record || !body.master) throw new Error("The rebuild came back empty.");
      setData({
        record: body.record,
        master: body.master,
        stale: false,
        statusChanged: Boolean(body.statusChanged),
      });
      setError(null);
      if (body.statusChanged) router.refresh();
      toast.success("Rebuilt from the current master resume");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not rebuild the resume.";
      setError(message);
      toast.error(message);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleCopy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(resumeToPlainText(data.record.tailored.document));
      setCopied(true);
      toast.success("Tailored resume copied as plain text");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("The browser blocked clipboard access. Use Download Markdown instead.");
    }
  }

  function handleDownload() {
    if (!data) return;
    const markdown = resumeToMarkdown(data.record.tailored.document);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = resumeFileName(
      data.record.tailored.document.contact.name,
      data.record.company,
      data.record.jobTitle,
    );
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown file downloaded");
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailored resume</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailored resume</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Could not build the tailored resume</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
              >
                <RefreshCwIcon />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { record, master, stale } = data;
  const tailored = record.tailored;

  if (isEmptyResume(tailored.document)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tailored resume</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <FileWarningIcon className="size-6 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            Your master resume has no skills, experience, projects, or
            education to draw on, so there is nothing to tailor. Nothing can be
            invented to fill it.
          </p>
          <Button asChild size="sm">
            <Link href="/profile">Edit your master resume</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tailored resume</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Built only from your master resume. Skills and bullets are reordered
          so the overlapping work comes first, and the summary sentence is the
          only text rewritten. Nothing from the posting is added.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void handleCopy()}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            Copy text
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <DownloadIcon />
            Download Markdown
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <PrinterIcon />
            Print
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleRegenerate()}
            disabled={regenerating}
          >
            {regenerating ? <Loader2Icon className="animate-spin" /> : <RefreshCwIcon />}
            Rebuild
          </Button>
        </div>

        {stale ? (
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>Your master resume changed after this was built</AlertTitle>
            <AlertDescription>
              {`This copy was saved on ${formatDayTime(record.generatedAt)}. Press Rebuild to tailor it again from the current resume.`}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-medium">Master resume</h3>
              <Badge variant="outline">unchanged</Badge>
            </div>
            <div className="rounded-lg border border-border p-4">
              <ResumeView document={master} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-sm font-medium">
                Tailored for {record.company}
              </h3>
              <Badge variant="secondary">{tailored.notes.roleFamilyLabel}</Badge>
            </div>
            {/* Only this subtree prints, so the printed page is the tailored
                resume alone rather than the whole comparison. */}
            <div
              data-print-area
              className="rounded-lg border border-border p-4 ring-1 ring-primary/20"
            >
              <ResumeView
                document={tailored.document}
                highlight={tailored.notes.highlighted}
              />
            </div>
          </section>
        </div>

        <TailoringNotes record={record} />
      </CardContent>
    </Card>
  );
}

function TailoringNotes({ record }: { record: TailoredRecord }) {
  const { notes } = record.tailored;

  // Several bullets can come from one entry, so sources are counted rather
  // than repeated.
  const perSource = new Map<string, number>();
  for (const bullet of notes.omittedBullets) {
    perSource.set(bullet.source, (perSource.get(bullet.source) ?? 0) + 1);
  }
  const sourceSummary = [...perSource.entries()]
    .map(([source, count]) => (count > 1 ? `${source} (${count})` : source))
    .join(", ");

  const summaryNote = `The summary sentence was replaced to name ${notes.roleFamilyLabel.toLowerCase()} work${
    notes.summaryTechnologies.length > 0
      ? ` and ${notes.summaryTechnologies.join(", ")}, all of which are already on your resume`
      : ""
  }.`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
      <h3 className="font-heading text-sm font-medium">What changed, and nothing else</h3>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-muted-foreground">
        <li>{summaryNote}</li>
        <li>
          {notes.highlighted.length > 0
            ? `${notes.highlighted.length} skill${notes.highlighted.length === 1 ? "" : "s"} moved to the front: ${notes.highlighted.join(", ")}. Every other skill is still listed after them.`
            : "No skill matched this posting, so the skill order is unchanged."}
        </li>
        <li>
          {notes.omittedBullets.length > 0
            ? `${notes.omittedBullets.length} bullet${notes.omittedBullets.length === 1 ? "" : "s"} left out for sharing no words with this posting, from ${sourceSummary}. No bullet was reworded.`
            : "Every bullet was kept, reordered by relevance only. No bullet was reworded."}
        </li>
        <li>
          Contact details, dates, degree, and CGPA are copied through exactly as
          stored.
        </li>
      </ul>
    </div>
  );
}
