import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sha256 } from "@/lib/server/crypto";
import { setSteps, userByStepToken } from "@/lib/server/repo";
import { date, localDate, num, Invalid } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Called by the iOS Shortcut with the day's step count from Apple Health.
 * Auth: personal token (Authorization: Bearer …), created in Ajustes. No Clerk session here.
 */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token.length < 20) return NextResponse.json({ error: "Falta el token" }, { status: 401 });
  try {
    const db = await getDb();
    const user = await userByStepToken(db, sha256(token));
    if (!user) return NextResponse.json({ error: "Token no válido" }, { status: 401 });
    const body = await parseBody(req);
    // Shortcuts may send "8.432" (Spanish thousands separator) or a decimal sum: keep the integer part.
    const raw = typeof body.steps === "string" ? body.steps.replace(/[.\s]/g, "").replace(",", ".") : body.steps;
    const steps = Math.floor(num(raw, "Pasos", 0, 200000));
    const d = body.date ? date(String(body.date).slice(0, 10)) : localDate(new Date(), user.tz);
    await setSteps(db, user.userId, d, steps, "atajo");
    return NextResponse.json({ ok: true, date: d, steps });
  } catch (e) {
    if (e instanceof Invalid) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  try {
    const v = JSON.parse(text);
    if (typeof v === "number") return { steps: v };
    return v && typeof v === "object" ? v : {};
  } catch {
    const p = new URLSearchParams(text);
    return p.has("steps") ? Object.fromEntries(p) : { steps: text.trim() };
  }
}
