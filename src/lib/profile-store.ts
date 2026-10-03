import { dataFile, readJsonFile, writeJsonFile } from "./atomic-json";
import {
  profileRecordSchema,
  profileSchema,
  type Profile,
  type ProfileRecord,
} from "./profile-schema";
import { PROFILE_SCHEMA_VERSION, SEED_PROFILE } from "./seed-profile";

const PROFILE_FILE = dataFile("profile.json");

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildSeedRecord(): ProfileRecord {
  return {
    version: PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    isSeedDefault: true,
    profile: clone(SEED_PROFILE),
  };
}

async function persist(record: ProfileRecord): Promise<ProfileRecord> {
  await writeJsonFile(PROFILE_FILE, record);
  return record;
}

export async function readProfileRecord(): Promise<ProfileRecord> {
  const raw = await readJsonFile(PROFILE_FILE);
  if (raw === null) {
    return persist(buildSeedRecord());
  }

  const parsed = profileRecordSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "data/profile.json does not match the expected shape. Fix or delete the file to fall back to the seeded resume.",
    );
  }
  return parsed.data;
}

export async function writeProfile(profile: Profile): Promise<ProfileRecord> {
  const validated = profileSchema.parse(profile);
  return persist({
    version: PROFILE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    isSeedDefault: false,
    profile: validated,
  });
}

export async function restoreSeedProfile(): Promise<ProfileRecord> {
  return persist(buildSeedRecord());
}

export const PROFILE_FILE_PATH = PROFILE_FILE;
