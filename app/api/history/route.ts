import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { getProfile, history, lastWeights } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";
import { date, Invalid } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId, req: Request) => {
  const u = new URL(req.url);
  const from = date(u.searchParams.get("from"));
  const to = date(u.searchParams.get("to"));
  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (span < 0 || span > 400) throw new Invalid("Rango no válido");
  const db = await getDb();
  const p = await getProfile(db, userId);
  const [days, weights] = await Promise.all([history(db, userId, p, from, to), lastWeights(db, userId)]);
  return NextResponse.json({ days, weights });
});
