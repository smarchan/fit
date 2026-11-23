import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { copyEntries } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { MEALS } from "@/lib/types";
import { date, oneOf } from "@/lib/validate";

export const POST = withUser(async (userId, req: Request) => {
  const b = await readJson(req);
  const meal = b.meal == null ? null : oneOf(b.meal, MEALS, "Comida");
  const n = await copyEntries(await getDb(), userId, date(b.from), date(b.to), meal);
  return NextResponse.json({ copied: n });
});
