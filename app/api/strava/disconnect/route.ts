import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { decrypt } from "@/lib/server/crypto";
import { getProfile, removeSource } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";
import { clearStrava } from "@/lib/server/sync";

export const POST = withUser(async (userId) => {
  const db = await getDb();
  const p = await getProfile(db, userId);
  const access = p.stravaAccessEnc ? decrypt(p.stravaAccessEnc) : null;
  if (access) {
    await fetch("https://www.strava.com/oauth/deauthorize", {
      method: "POST",
      headers: { authorization: `Bearer ${access}` },
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }
  await clearStrava(db, userId);
  await removeSource(db, userId, "strava");
  return NextResponse.json({ ok: true });
});
