import { NextResponse } from "next/server";
import { z } from "zod";

import { profileSchema } from "@/lib/profile-schema";
import { readProfileRecord, writeProfile } from "@/lib/profile-store";

export const dynamic = "force-dynamic";

function failure(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function GET() {
  try {
    const record = await readProfileRecord();
    return NextResponse.json(record);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Could not read the profile.",
      500,
    );
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Request body was not valid JSON.", 400);
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return failure(
      "Some fields are not valid. Nothing was saved.",
      422,
      z.treeifyError(parsed.error),
    );
  }

  try {
    const record = await writeProfile(parsed.data);
    return NextResponse.json(record);
  } catch (error) {
    return failure(
      error instanceof Error
        ? `Could not write data/profile.json: ${error.message}`
        : "Could not write the profile to disk.",
      500,
    );
  }
}
