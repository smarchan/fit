import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { searchOff } from "@/lib/server/off";
import { customFoods } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";
import { norm, searchGeneric } from "@/lib/generic";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId, req: Request) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ foods: [] });
  const words = norm(q).split(/\s+/);
  const [custom, off] = await Promise.all([customFoods(await getDb(), userId), searchOff(q)]);
  const mine = custom.filter((f) => words.every((w) => norm(`${f.name} ${f.brand ?? ""}`).includes(w)));
  const seen = new Set<string>();
  const foods = [...mine, ...searchGeneric(q, 6), ...off].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
  return NextResponse.json({ foods: foods.slice(0, 30), offFailed: off.length === 0 });
});
