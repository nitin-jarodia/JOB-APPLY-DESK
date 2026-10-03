import { cn } from "@/lib/utils";
import type { ResumeDocument } from "@/lib/tailor/types";

/**
 * One renderer for both sides of the preview and for print, so what gets
 * printed is literally what was shown.
 */
export function ResumeView({
  document,
  highlight = [],
  className,
}: {
  document: ResumeDocument;
  /** Skill strings to mark as the reason this ordering was chosen. */
  highlight?: string[];
  className?: string;
}) {
  const highlighted = new Set(highlight);
  const contacts = [
    document.contact.phone,
    document.contact.email,
    document.contact.linkedin,
    document.contact.github,
    document.contact.leetcode,
  ].filter((value) => value.trim() !== "");

  return (
    <div className={cn("resume-doc flex flex-col gap-4 text-sm", className)}>
      <header className="flex flex-col gap-1">
        <h3 className="font-heading text-lg leading-tight font-semibold">
          {document.contact.name}
        </h3>
        {contacts.length > 0 ? (
          <p className="text-xs break-words text-muted-foreground">
            {contacts.join(" · ")}
          </p>
        ) : null}
      </header>

      {document.summary.trim() ? (
        <Section title="Summary">
          <p className="leading-relaxed">{document.summary}</p>
        </Section>
      ) : null}

      {document.skillGroups.length > 0 ? (
        <Section title="Skills">
          <dl className="flex flex-col gap-1">
            {document.skillGroups.map((group) => (
              <div key={group.id} className="flex flex-wrap gap-x-1.5">
                <dt className="font-medium">{group.label}:</dt>
                <dd className="min-w-0">
                  {group.skills.map((skill, index) => (
                    <span key={skill}>
                      <span
                        className={cn(
                          highlighted.has(skill) &&
                            "rounded-sm bg-emerald-500/15 px-1 font-medium text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {skill}
                      </span>
                      {index < group.skills.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {document.experience.length > 0 ? (
        <Section title="Experience">
          <div className="flex flex-col gap-3">
            {document.experience.map((entry) => (
              <Entry
                key={entry.id}
                heading={entry.role}
                subheading={entry.organization}
                meta={[entry.location, entry.period]}
                bullets={entry.bullets}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {document.projects.length > 0 ? (
        <Section title="Projects">
          <div className="flex flex-col gap-3">
            {document.projects.map((project) => (
              <Entry
                key={project.id}
                heading={project.name}
                stack={project.stack}
                highlighted={highlighted}
                bullets={project.bullets}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {document.education.length > 0 ? (
        <Section title="Education">
          <div className="flex flex-col gap-3">
            {document.education.map((entry) => (
              <Entry
                key={entry.id}
                heading={entry.institution}
                subheading={entry.degree}
                meta={[entry.location, entry.period, entry.score]}
                bullets={[]}
                footer={
                  entry.coursework.length > 0
                    ? `Coursework: ${entry.coursework.join(", ")}`
                    : undefined
                }
              />
            ))}
          </div>
        </Section>
      ) : null}

      {document.achievements.length > 0 ? (
        <Section title="Achievements">
          <ul className="flex list-disc flex-col gap-1 pl-4">
            {document.achievements.map((achievement) => (
              <li key={achievement}>{achievement}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="resume-section flex flex-col gap-1.5">
      <h4 className="border-b border-border pb-1 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Entry({
  heading,
  subheading,
  meta = [],
  stack,
  highlighted,
  bullets,
  footer,
}: {
  heading: string;
  subheading?: string;
  meta?: (string | undefined)[];
  stack?: string[];
  highlighted?: Set<string>;
  bullets: string[];
  footer?: string;
}) {
  const metaLine = meta.filter((part) => part && part.trim() !== "").join(" · ");

  return (
    <div className="resume-entry flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{heading}</span>
        {subheading ? (
          <span className="text-muted-foreground">{subheading}</span>
        ) : null}
      </div>
      {metaLine ? <p className="text-xs text-muted-foreground">{metaLine}</p> : null}
      {stack && stack.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Stack:{" "}
          {stack.map((item, index) => (
            <span key={item}>
              <span
                className={cn(
                  highlighted?.has(item) &&
                    "rounded-sm bg-emerald-500/15 px-1 font-medium text-emerald-700 dark:text-emerald-300",
                )}
              >
                {item}
              </span>
              {index < stack.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      ) : null}
      {bullets.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
    </div>
  );
}
