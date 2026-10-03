import { z } from "zod";

const trimmed = z.string().trim();

export const contactSchema = z.object({
  name: trimmed.min(1, "Name is required"),
  phone: trimmed,
  email: trimmed,
  linkedin: trimmed,
  github: trimmed,
  leetcode: trimmed,
});

export const skillGroupSchema = z.object({
  id: trimmed.min(1),
  label: trimmed.min(1, "Skill group needs a label"),
  skills: z.array(trimmed.min(1)),
});

export const experienceSchema = z.object({
  id: trimmed.min(1),
  role: trimmed.min(1, "Role is required"),
  organization: trimmed,
  location: trimmed,
  period: trimmed,
  bullets: z.array(trimmed.min(1)),
});

export const projectSchema = z.object({
  id: trimmed.min(1),
  name: trimmed.min(1, "Project name is required"),
  stack: z.array(trimmed.min(1)),
  bullets: z.array(trimmed.min(1)),
});

export const educationSchema = z.object({
  id: trimmed.min(1),
  institution: trimmed.min(1, "Institution is required"),
  location: trimmed,
  period: trimmed,
  degree: trimmed,
  score: trimmed,
  coursework: z.array(trimmed.min(1)),
});

export const preferencesSchema = z.object({
  roleTypes: z.array(trimmed.min(1)),
  roleFunctions: z.array(trimmed.min(1)),
  locations: z.array(trimmed.min(1)),
  graduationYear: trimmed,
  needsVisaSponsorshipInIndia: z.boolean(),
  notes: trimmed,
});

export const profileSchema = z.object({
  contact: contactSchema,
  summary: trimmed,
  skillGroups: z.array(skillGroupSchema),
  experience: z.array(experienceSchema),
  projects: z.array(projectSchema),
  education: z.array(educationSchema),
  achievements: z.array(trimmed.min(1)),
  preferences: preferencesSchema,
});

export const profileRecordSchema = z.object({
  version: z.number().int(),
  updatedAt: z.string(),
  isSeedDefault: z.boolean(),
  profile: profileSchema,
});

export type Contact = z.infer<typeof contactSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ProfileRecord = z.infer<typeof profileRecordSchema>;
