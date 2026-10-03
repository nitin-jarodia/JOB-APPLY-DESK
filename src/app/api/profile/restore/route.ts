import { NextResponse } from "next/server";

import { restoreSeedProfile } from "@/lib/profile-store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const record = await restoreSeedProfile();
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Could not restore the seeded resume: ${error.message}`
            : "Could not restore the seeded resume.",
      },
      { status: 500 },
    );
  }
}
