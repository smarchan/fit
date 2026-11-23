import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { requireUser } from "@/lib/server/session";
import { saveStravaTokens, stravaToken, syncAll } from "@/lib/server/sync";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = await requireUser();
  if (typeof u !== "string") return u;
  const url = new URL(req.url);
  const back = (s: string) => {
    const res = NextResponse.redirect(`${url.origin}/?tab=ajustes&strava=${s}`);
    res.cookies.delete({ name: "strava_state", path: "/api/strava" });
    return res;
  };
  const state = req.cookies.get("strava_state")?.value;
  if (!state || state !== url.searchParams.get("state")) return back("error");
  if (url.searchParams.get("error")) return back("denied");
  const scope = url.searchParams.get("scope") ?? "";
  if (!scope.includes("activity:read")) return back("scope");
  const code = url.searchParams.get("code");
  if (!code) return back("error");
  try {
    const t = await stravaToken({ code, grant_type: "authorization_code" });
    const db = await getDb();
    await saveStravaTokens(db, u, t);
    await syncAll(db, u, true);
    return back("ok");
  } catch (e) {
    console.error(e);
    return back("error");
  }
}
