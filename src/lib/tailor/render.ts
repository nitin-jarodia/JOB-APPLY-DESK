import type { ResumeDocument } from "./types";

function contactLine(document: ResumeDocument): string[] {
  const { phone, email, linkedin, github, leetcode } = document.contact;
  return [phone, email, linkedin, github, leetcode].filter((value) => value.trim() !== "");
}

function metaLine(parts: (string | undefined)[]): string {
  return parts.filter((part) => part && part.trim() !== "").join(" · ");
}

export function resumeToMarkdown(document: ResumeDocument): string {
  const lines: string[] = [];

  lines.push(`# ${document.contact.name}`, "");
  const contacts = contactLine(document);
  if (contacts.length > 0) lines.push(contacts.join(" · "), "");

  if (document.summary.trim()) {
    lines.push("## Summary", "", document.summary.trim(), "");
  }

  if (document.skillGroups.length > 0) {
    lines.push("## Skills", "");
    for (const group of document.skillGroups) {
      if (group.skills.length === 0) continue;
      lines.push(`**${group.label}:** ${group.skills.join(", ")}`, "");
    }
  }

  if (document.experience.length > 0) {
    lines.push("## Experience", "");
    for (const entry of document.experience) {
      lines.push(`### ${metaLine([entry.role, entry.organization])}`);
      const meta = metaLine([entry.location, entry.period]);
      if (meta) lines.push(meta);
      lines.push("");
      for (const bullet of entry.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }

  if (document.projects.length > 0) {
    lines.push("## Projects", "");
    for (const project of document.projects) {
      lines.push(`### ${project.name}`);
      if (project.stack.length > 0) lines.push(`**Stack:** ${project.stack.join(", ")}`);
      lines.push("");
      for (const bullet of project.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }

  if (document.education.length > 0) {
    lines.push("## Education", "");
    for (const entry of document.education) {
      lines.push(`### ${entry.institution}`);
      const meta = metaLine([entry.degree, entry.location, entry.period, entry.score]);
      if (meta) lines.push(meta);
      if (entry.coursework.length > 0) {
        lines.push("", `**Coursework:** ${entry.coursework.join(", ")}`);
      }
      lines.push("");
    }
  }

  if (document.achievements.length > 0) {
    lines.push("## Achievements", "");
    for (const achievement of document.achievements) lines.push(`- ${achievement}`);
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

export function resumeToPlainText(document: ResumeDocument): string {
  const lines: string[] = [];

  lines.push(document.contact.name);
  const contacts = contactLine(document);
  if (contacts.length > 0) lines.push(contacts.join(" | "));
  lines.push("");

  if (document.summary.trim()) {
    lines.push("SUMMARY", document.summary.trim(), "");
  }

  if (document.skillGroups.length > 0) {
    lines.push("SKILLS");
    for (const group of document.skillGroups) {
      if (group.skills.length === 0) continue;
      lines.push(`${group.label}: ${group.skills.join(", ")}`);
    }
    lines.push("");
  }

  if (document.experience.length > 0) {
    lines.push("EXPERIENCE");
    for (const entry of document.experience) {
      lines.push(metaLine([entry.role, entry.organization]));
      const meta = metaLine([entry.location, entry.period]);
      if (meta) lines.push(meta);
      for (const bullet of entry.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }

  if (document.projects.length > 0) {
    lines.push("PROJECTS");
    for (const project of document.projects) {
      lines.push(project.name);
      if (project.stack.length > 0) lines.push(`Stack: ${project.stack.join(", ")}`);
      for (const bullet of project.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }

  if (document.education.length > 0) {
    lines.push("EDUCATION");
    for (const entry of document.education) {
      lines.push(entry.institution);
      const meta = metaLine([entry.degree, entry.location, entry.period, entry.score]);
      if (meta) lines.push(meta);
      if (entry.coursework.length > 0) {
        lines.push(`Coursework: ${entry.coursework.join(", ")}`);
      }
      lines.push("");
    }
  }

  if (document.achievements.length > 0) {
    lines.push("ACHIEVEMENTS");
    for (const achievement of document.achievements) lines.push(`- ${achievement}`);
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

/** Stable, filesystem-safe name for the downloaded file. */
export function resumeFileName(name: string, company: string, title: string): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return [slug(name) || "resume", slug(company), slug(title).slice(0, 40)]
    .filter(Boolean)
    .join("-")
    .concat(".md");
}
