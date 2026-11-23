import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { getDay, getProfile, publicProfile, streak } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";
import { date } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId, req: Request) => {
  const url = new URL(req.url);
  const d = date(url.searchParams.get("date"));
  const today = url.searchParams.get("today") ? date(url.searchParams.get("today")) : d;
  const db = await getDb();
  const [profile, day, s] = await Promise.all([getProfile(db, userId), getDay(db, userId, d), streak(db, userId, today)]);
  return NextResponse.json({ profile: publicProfile(profile), day, streak: s, syncedAt: profile.syncedAt });
});
