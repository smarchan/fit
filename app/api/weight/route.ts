import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { setWeight } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { date, optNum } from "@/lib/validate";

export const PUT = withUser(async (userId, req: Request) => {
  const b = await readJson(req);
  await setWeight(await getDb(), userId, date(b.date), optNum(b.kg, "Peso", 30, 300));
  return NextResponse.json({ ok: true });
});
