import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/server/session";
import { stravaConfigured } from "@/lib/server/sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = await requireUser();
  if (typeof u !== "string") return u;
  const origin = new URL(req.url).origin;
  if (!stravaConfigured()) return NextResponse.redirect(`${origin}/?tab=ajustes&strava=config`);
  const state = randomBytes(16).toString("hex");
  const auth = new URL("https://www.strava.com/oauth/authorize");
  auth.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  auth.searchParams.set("redirect_uri", `${origin}/api/strava/callback`);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("approval_prompt", "auto");
  auth.searchParams.set("scope", "activity:read_all");
  auth.searchParams.set("state", state);
  const res = NextResponse.redirect(auth);
  res.cookies.set("strava_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/strava" });
  return res;
}
