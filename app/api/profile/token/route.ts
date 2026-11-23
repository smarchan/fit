import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { newToken, sha256 } from "@/lib/server/crypto";
import { updateProfile } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";

/** New personal token for the iOS Shortcut. Shown once; creating another revokes the previous one. */
export const POST = withUser(async (userId) => {
  const token = newToken();
  await updateProfile(await getDb(), userId, { stepTokenHash: sha256(token) });
  return NextResponse.json({ token });
});

export const DELETE = withUser(async (userId) => {
  await updateProfile(await getDb(), userId, { stepTokenHash: null });
  return NextResponse.json({ ok: true });
});
