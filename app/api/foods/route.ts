import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { newId } from "@/lib/server/crypto";
import { customFoods, recentFoods, saveCustomFood } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { foodInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId) => {
  const db = await getDb();
  const [recent, custom] = await Promise.all([recentFoods(db, userId), customFoods(db, userId)]);
  return NextResponse.json({ recent, custom });
});

export const POST = withUser(async (userId, req: Request) => {
  const b = await readJson(req);
  const id = typeof b.id === "string" && b.id.startsWith("c:") ? b.id.slice(0, 40) : "c:" + newId();
  const food = { id, ...foodInput(b) };
  await saveCustomFood(await getDb(), userId, food);
  return NextResponse.json({ food });
});
