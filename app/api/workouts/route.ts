import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { addWorkout, getProfile } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { toWrite } from "@/lib/server/workouts";
import { workoutInput } from "@/lib/validate";

export const POST = withUser(async (userId, req: Request) => {
  const db = await getDb();
  const w = workoutInput(await readJson(req));
  const id = await addWorkout(db, userId, toWrite(w, await getProfile(db, userId)));
  return NextResponse.json({ id });
});
