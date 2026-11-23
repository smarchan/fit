import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { setSteps } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { date, num } from "@/lib/validate";

export const PUT = withUser(async (userId, req: Request) => {
  const b = await readJson(req);
  await setSteps(await getDb(), userId, date(b.date), num(b.steps, "Pasos", 0, 200000), "manual");
  return NextResponse.json({ ok: true });
});
