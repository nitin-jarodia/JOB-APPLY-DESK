import { z } from "zod";

import {
  contactSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  skillGroupSchema,
} from "@/lib/profile-schema";

/**
 * The printable part of a resume. This is the master profile minus the job
 * search preferences, which are settings rather than resume content.
 */
export const resumeDocumentSchema = z.object({
  contact: contactSchema,
  summary: z.string(),
  skillGroups: z.array(skillGroupSchema),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
  achievements: z.array(z.string()),
});

export const tailoringNotesSchema = z.object({
  roleFamilyLabel: z.string(),
  /** Resume skill strings moved to the front because the posting names them. */
  highlighted: z.array(z.string()),
  /** Bullets left out for sharing no words with the posting, kept for audit. */
  omittedBullets: z.array(z.object({ source: z.string(), text: z.string() })),
  /** Technologies named in the rewritten summary. All come from the resume. */
  summaryTechnologies: z.array(z.string()),
});

export const tailoredResumeSchema = z.object({
  document: resumeDocumentSchema,
  notes: tailoringNotesSchema,
});

export const tailoredRecordSchema = z.object({
  jobId: z.string(),
  slug: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  applyUrl: z.string(),
  generatedAt: z.string(),
  /** Lets the UI say when the master resume changed after this was built. */
  profileUpdatedAt: z.string(),
  tailored: tailoredResumeSchema,
});

export const tailoredFileSchema = z.object({
  version: z.number().int(),
  entries: z.record(z.string(), tailoredRecordSchema),
});

export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type TailoringNotes = z.infer<typeof tailoringNotesSchema>;
export type TailoredResume = z.infer<typeof tailoredResumeSchema>;
export type TailoredRecord = z.infer<typeof tailoredRecordSchema>;
export type TailoredFile = z.infer<typeof tailoredFileSchema>;

export const TAILORED_FILE_VERSION = 1;
