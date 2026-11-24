import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { setDayGoal } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { dayGoalInput } from "@/lib/validate";

/** Targets typed for one day. Sending every field as null puts that day back to automatic. */
export const PUT = withUser(async (userId, req: Request) => {
  const { date, ...goal } = dayGoalInput(await readJson(req));
  await setDayGoal(await getDb(), userId, date, goal);
  return NextResponse.json({ ok: true });
});
