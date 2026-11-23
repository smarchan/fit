import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { deleteWorkout, getProfile, updateWorkout } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { toWrite } from "@/lib/server/workouts";
import { workoutInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withUser(async (userId, req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const db = await getDb();
  const ok = await updateWorkout(db, userId, id, toWrite(workoutInput(await readJson(req)), await getProfile(db, userId)));
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "No existe" }, { status: 404 });
});

export const DELETE = withUser(async (userId, _req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteWorkout(await getDb(), userId, id);
  return NextResponse.json({ ok: true });
});
