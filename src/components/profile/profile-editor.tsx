"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  RotateCcwIcon,
  SaveIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import { StringListEditor } from "@/components/profile/string-list-editor";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDayTime } from "@/lib/format-date";
import type {
  Education,
  Experience,
  Profile,
  ProfileRecord,
  Project,
  SkillGroup,
} from "@/lib/profile-schema";

const SECTIONS = [
  { id: "contact", label: "Contact" },
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "achievements", label: "Achievements" },
  { id: "preferences", label: "Search preferences" },
] as const;

function newId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${suffix}`;
}

function formatTimestamp(iso: string) {
  return formatDayTime(iso) ?? iso;
}

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

async function fetchProfileRecord(): Promise<ProfileRecord> {
  const response = await fetch("/api/profile", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      await readError(response, `Request failed with ${response.status}.`),
    );
  }
  return (await response.json()) as ProfileRecord;
}

export function ProfileEditor() {
  const [saved, setSaved] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchProfileRecord()
      .then((record) => {
        if (!active) return;
        setSaved(record);
        setDraft(record.profile);
        setSaveError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not reach the local API.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  function retryLoad() {
    setLoading(true);
    setLoadError(null);
    setLoadAttempt((attempt) => attempt + 1);
  }

  const isDirty = useMemo(() => {
    if (!draft || !saved) return false;
    return JSON.stringify(draft) !== JSON.stringify(saved.profile);
  }, [draft, saved]);

  useEffect(() => {
    if (!isDirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const update = useCallback((updater: (current: Profile) => Profile) => {
    setDraft((current) => (current ? updater(current) : current));
  }, []);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, `Save failed with ${response.status}.`),
        );
      }
      const record = (await response.json()) as ProfileRecord;
      setSaved(record);
      setDraft(record.profile);
      toast.success("Profile saved to data/profile.json");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save. Your edits are still on screen.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/profile/restore", { method: "POST" });
      if (!response.ok) {
        throw new Error(
          await readError(response, `Restore failed with ${response.status}.`),
        );
      }
      const record = (await response.json()) as ProfileRecord;
      setSaved(record);
      setDraft(record.profile);
      toast.success("Seeded resume restored");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not restore the seeded resume.";
      setSaveError(message);
      toast.error(message);
    } finally {
      setRestoring(false);
    }
  }

  function handleDiscard() {
    if (!saved) return;
    setDraft(saved.profile);
    setSaveError(null);
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (loadError || !draft || !saved) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon />
        <AlertTitle>Could not load the profile</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{loadError ?? "The profile came back empty."}</span>
          <Button variant="outline" size="sm" onClick={retryLoad}>
            <RotateCcwIcon />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const busy = saving || restoring;

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {isDirty ? (
              <Badge variant="secondary">Unsaved changes</Badge>
            ) : (
              <Badge variant="outline">
                <CheckIcon />
                Saved
              </Badge>
            )}
            {saved.isSeedDefault ? (
              <Badge variant="outline">Seeded resume</Badge>
            ) : null}
            <span className="hidden sm:inline">
              Last saved {formatTimestamp(saved.updatedAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={busy}>
                  {restoring ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <RotateCcwIcon />
                  )}
                  Restore seeded resume
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore the seeded resume?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This replaces everything on this page with the resume the
                    desk was seeded with. Any edits you have made, saved or not,
                    are discarded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel size="sm">Keep my edits</AlertDialogCancel>
                  <AlertDialogAction
                    size="sm"
                    onClick={() => void handleRestore()}
                  >
                    Restore
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              disabled={busy || !isDirty}
            >
              Discard edits
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={busy || !isDirty}>
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Save changes
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground sm:hidden">
          Last saved {formatTimestamp(saved.updatedAt)}
        </p>
      </div>

      {saveError ? (
        <Alert variant="destructive">
          <AlertTriangleIcon />
          <AlertTitle>Save failed</AlertTitle>
          <AlertDescription>
            {saveError} Your edits are still on screen, so you can fix the field
            and press Save again.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav
          aria-label="Profile sections"
          className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-6">
          <ContactSection draft={draft} update={update} disabled={busy} />
          <SummarySection draft={draft} update={update} disabled={busy} />
          <SkillsSection draft={draft} update={update} disabled={busy} />
          <ExperienceSection draft={draft} update={update} disabled={busy} />
          <ProjectsSection draft={draft} update={update} disabled={busy} />
          <EducationSection draft={draft} update={update} disabled={busy} />
          <AchievementsSection draft={draft} update={update} disabled={busy} />
          <PreferencesSection draft={draft} update={update} disabled={busy} />
        </div>
      </div>
    </div>
  );
}

type SectionProps = {
  draft: Profile;
  update: (updater: (current: Profile) => Profile) => void;
  disabled: boolean;
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ContactSection({ draft, update, disabled }: SectionProps) {
  const { contact } = draft;
  function set(key: keyof Profile["contact"], value: string) {
    update((current) => ({
      ...current,
      contact: { ...current.contact, [key]: value },
    }));
  }

  return (
    <Card id="contact" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Contact and links</CardTitle>
        <CardDescription>
          Shown at the top of every tailored resume this desk writes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field
          id="contact-name"
          label="Full name"
          value={contact.name}
          onChange={(value) => set("name", value)}
          disabled={disabled}
        />
        <Field
          id="contact-phone"
          label="Phone"
          value={contact.phone}
          onChange={(value) => set("phone", value)}
          disabled={disabled}
        />
        <Field
          id="contact-email"
          label="Email"
          type="email"
          value={contact.email}
          onChange={(value) => set("email", value)}
          disabled={disabled}
        />
        <Field
          id="contact-linkedin"
          label="LinkedIn"
          type="url"
          value={contact.linkedin}
          onChange={(value) => set("linkedin", value)}
          disabled={disabled}
        />
        <Field
          id="contact-github"
          label="GitHub"
          type="url"
          value={contact.github}
          onChange={(value) => set("github", value)}
          disabled={disabled}
        />
        <Field
          id="contact-leetcode"
          label="LeetCode"
          type="url"
          value={contact.leetcode}
          onChange={(value) => set("leetcode", value)}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

function SummarySection({ draft, update, disabled }: SectionProps) {
  return (
    <Card id="summary" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Summary</CardTitle>
        <CardDescription>
          Keep this factual. Tailoring may reorder these claims but will not add
          new ones.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="summary-text" className="sr-only">
          Summary
        </Label>
        <Textarea
          id="summary-text"
          value={draft.summary}
          disabled={disabled}
          placeholder="A few sentences about who you are and what you build."
          className="min-h-28"
          onChange={(event) =>
            update((current) => ({ ...current, summary: event.target.value }))
          }
        />
        {draft.summary.trim().length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No summary yet. Write one, or restore the seeded resume to bring the
            original back.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SkillsSection({ draft, update, disabled }: SectionProps) {
  function setGroups(groups: SkillGroup[]) {
    update((current) => ({ ...current, skillGroups: groups }));
  }

  function patchGroup(id: string, patch: Partial<SkillGroup>) {
    setGroups(
      draft.skillGroups.map((group) =>
        group.id === id ? { ...group, ...patch } : group,
      ),
    );
  }

  return (
    <Card id="skills" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <CardDescription>
          Grouped exactly as they should appear on the resume.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              setGroups([
                ...draft.skillGroups,
                { id: newId("group"), label: "", skills: [] },
              ])
            }
          >
            <PlusIcon />
            Group
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {draft.skillGroups.length === 0 ? (
          <EmptyState text="No skill groups yet. Add one such as Languages or Databases." />
        ) : (
          draft.skillGroups.map((group, index) => (
            <div key={group.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator /> : null}
              <div className="flex items-end gap-2">
                <div className="flex min-w-0 grow flex-col gap-1.5">
                  <Label htmlFor={`group-${group.id}`}>Group label</Label>
                  <Input
                    id={`group-${group.id}`}
                    value={group.label}
                    placeholder="Languages"
                    disabled={disabled}
                    onChange={(event) =>
                      patchGroup(group.id, { label: event.target.value })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${group.label || "skill group"}`}
                  disabled={disabled}
                  onClick={() =>
                    setGroups(
                      draft.skillGroups.filter((item) => item.id !== group.id),
                    )
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
              <StringListEditor
                label={`${group.label || "Skill"} entry`}
                items={group.skills}
                onChange={(skills) => patchGroup(group.id, { skills })}
                addLabel="Add skill"
                emptyLabel="No skills in this group yet."
                placeholder="TypeScript"
                disabled={disabled}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ExperienceSection({ draft, update, disabled }: SectionProps) {
  function setItems(items: Experience[]) {
    update((current) => ({ ...current, experience: items }));
  }

  function patchItem(id: string, patch: Partial<Experience>) {
    setItems(
      draft.experience.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  return (
    <Card id="experience" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Experience</CardTitle>
        <CardDescription>
          Only roles that actually happened, with the dates they actually ran.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              setItems([
                ...draft.experience,
                {
                  id: newId("role"),
                  role: "",
                  organization: "",
                  location: "",
                  period: "",
                  bullets: [],
                },
              ])
            }
          >
            <PlusIcon />
            Role
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {draft.experience.length === 0 ? (
          <EmptyState text="No experience entries yet." />
        ) : (
          draft.experience.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator /> : null}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {item.role || "Untitled role"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.role || "role"}`}
                  disabled={disabled}
                  onClick={() =>
                    setItems(draft.experience.filter((e) => e.id !== item.id))
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`exp-role-${item.id}`}
                  label="Role"
                  value={item.role}
                  onChange={(value) => patchItem(item.id, { role: value })}
                  disabled={disabled}
                />
                <Field
                  id={`exp-org-${item.id}`}
                  label="Organization"
                  value={item.organization}
                  onChange={(value) =>
                    patchItem(item.id, { organization: value })
                  }
                  disabled={disabled}
                />
                <Field
                  id={`exp-loc-${item.id}`}
                  label="Location"
                  value={item.location}
                  onChange={(value) => patchItem(item.id, { location: value })}
                  disabled={disabled}
                />
                <Field
                  id={`exp-period-${item.id}`}
                  label="Dates"
                  value={item.period}
                  placeholder="Mar 2026 – Jun 2026"
                  onChange={(value) => patchItem(item.id, { period: value })}
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Bullets</Label>
                <StringListEditor
                  label="Experience bullet"
                  items={item.bullets}
                  onChange={(bullets) => patchItem(item.id, { bullets })}
                  addLabel="Add bullet"
                  emptyLabel="No bullets for this role yet."
                  multiline
                  disabled={disabled}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsSection({ draft, update, disabled }: SectionProps) {
  function setItems(items: Project[]) {
    update((current) => ({ ...current, projects: items }));
  }

  function patchItem(id: string, patch: Partial<Project>) {
    setItems(
      draft.projects.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  return (
    <Card id="projects" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          Each project keeps its own stack list so tailoring can pick the
          relevant ones.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              setItems([
                ...draft.projects,
                { id: newId("project"), name: "", stack: [], bullets: [] },
              ])
            }
          >
            <PlusIcon />
            Project
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {draft.projects.length === 0 ? (
          <EmptyState text="No projects yet." />
        ) : (
          draft.projects.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator /> : null}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {item.name || "Untitled project"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.name || "project"}`}
                  disabled={disabled}
                  onClick={() =>
                    setItems(draft.projects.filter((p) => p.id !== item.id))
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
              <Field
                id={`project-name-${item.id}`}
                label="Project name"
                value={item.name}
                onChange={(value) => patchItem(item.id, { name: value })}
                disabled={disabled}
              />
              <div className="flex flex-col gap-1.5">
                <Label>Stack</Label>
                <StringListEditor
                  label="Stack item"
                  items={item.stack}
                  onChange={(stack) => patchItem(item.id, { stack })}
                  addLabel="Add technology"
                  emptyLabel="No technologies listed yet."
                  placeholder="FastAPI"
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Bullets</Label>
                <StringListEditor
                  label="Project bullet"
                  items={item.bullets}
                  onChange={(bullets) => patchItem(item.id, { bullets })}
                  addLabel="Add bullet"
                  emptyLabel="No bullets for this project yet."
                  multiline
                  disabled={disabled}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EducationSection({ draft, update, disabled }: SectionProps) {
  function setItems(items: Education[]) {
    update((current) => ({ ...current, education: items }));
  }

  function patchItem(id: string, patch: Partial<Education>) {
    setItems(
      draft.education.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  return (
    <Card id="education" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Education</CardTitle>
        <CardDescription>
          Degrees, dates, and scores are copied verbatim into tailored resumes.
        </CardDescription>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              setItems([
                ...draft.education,
                {
                  id: newId("education"),
                  institution: "",
                  location: "",
                  period: "",
                  degree: "",
                  score: "",
                  coursework: [],
                },
              ])
            }
          >
            <PlusIcon />
            Entry
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {draft.education.length === 0 ? (
          <EmptyState text="No education entries yet." />
        ) : (
          draft.education.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-3">
              {index > 0 ? <Separator /> : null}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {item.institution || "Untitled institution"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${item.institution || "education entry"}`}
                  disabled={disabled}
                  onClick={() =>
                    setItems(draft.education.filter((e) => e.id !== item.id))
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`edu-inst-${item.id}`}
                  label="Institution"
                  value={item.institution}
                  onChange={(value) =>
                    patchItem(item.id, { institution: value })
                  }
                  disabled={disabled}
                />
                <Field
                  id={`edu-loc-${item.id}`}
                  label="Location"
                  value={item.location}
                  onChange={(value) => patchItem(item.id, { location: value })}
                  disabled={disabled}
                />
                <Field
                  id={`edu-degree-${item.id}`}
                  label="Degree"
                  value={item.degree}
                  onChange={(value) => patchItem(item.id, { degree: value })}
                  disabled={disabled}
                />
                <Field
                  id={`edu-period-${item.id}`}
                  label="Years"
                  value={item.period}
                  placeholder="2023 – 2027"
                  onChange={(value) => patchItem(item.id, { period: value })}
                  disabled={disabled}
                />
                <Field
                  id={`edu-score-${item.id}`}
                  label="Score"
                  value={item.score}
                  placeholder="CGPA: 6.73/10"
                  onChange={(value) => patchItem(item.id, { score: value })}
                  disabled={disabled}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Coursework</Label>
                <StringListEditor
                  label="Course"
                  items={item.coursework}
                  onChange={(coursework) => patchItem(item.id, { coursework })}
                  addLabel="Add course"
                  emptyLabel="No coursework listed yet."
                  placeholder="Operating Systems"
                  disabled={disabled}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function AchievementsSection({ draft, update, disabled }: SectionProps) {
  return (
    <Card id="achievements" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
        <CardDescription>
          Numbers here should be ones you can defend in an interview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StringListEditor
          label="Achievement"
          items={draft.achievements}
          onChange={(achievements) =>
            update((current) => ({ ...current, achievements }))
          }
          addLabel="Add achievement"
          emptyLabel="No achievements yet."
          multiline
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

function PreferencesSection({ draft, update, disabled }: SectionProps) {
  const { preferences } = draft;

  function set<K extends keyof Profile["preferences"]>(
    key: K,
    value: Profile["preferences"][K],
  ) {
    update((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }));
  }

  return (
    <Card id="preferences" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Job search preferences</CardTitle>
        <CardDescription>
          These drive the job search and scoring steps that come later.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label>Role types</Label>
          <StringListEditor
            label="Role type"
            items={preferences.roleTypes}
            onChange={(roleTypes) => set("roleTypes", roleTypes)}
            addLabel="Add role type"
            emptyLabel="No role types yet."
            placeholder="New-grad roles"
            disabled={disabled}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <Label>Role functions</Label>
          <StringListEditor
            label="Role function"
            items={preferences.roleFunctions}
            onChange={(roleFunctions) => set("roleFunctions", roleFunctions)}
            addLabel="Add function"
            emptyLabel="No role functions yet."
            placeholder="Backend"
            disabled={disabled}
          />
        </div>
        <Separator />
        <div className="flex flex-col gap-1.5">
          <Label>Locations</Label>
          <StringListEditor
            label="Location"
            items={preferences.locations}
            onChange={(locations) => set("locations", locations)}
            addLabel="Add location"
            emptyLabel="No locations yet."
            placeholder="Remote roles open to India"
            disabled={disabled}
          />
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pref-grad-year"
            label="Graduation year"
            value={preferences.graduationYear}
            onChange={(value) => set("graduationYear", value)}
            disabled={disabled}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pref-visa">Visa sponsorship inside India</Label>
            <div className="flex h-8 items-center gap-2">
              <input
                id="pref-visa"
                type="checkbox"
                className="size-4 accent-primary"
                checked={preferences.needsVisaSponsorshipInIndia}
                disabled={disabled}
                onChange={(event) =>
                  set("needsVisaSponsorshipInIndia", event.target.checked)
                }
              />
              <span className="text-sm text-muted-foreground">
                Needs sponsorship to work in India
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pref-notes">Notes</Label>
          <Textarea
            id="pref-notes"
            value={preferences.notes}
            disabled={disabled}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
