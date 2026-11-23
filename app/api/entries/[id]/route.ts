import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { deleteEntry, updateEntry } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { entryPatch } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser(async (userId, req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const ok = await updateEntry(await getDb(), userId, id, entryPatch(await readJson(req)));
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "No existe" }, { status: 404 });
});

export const DELETE = withUser(async (userId, _req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteEntry(await getDb(), userId, id);
  return NextResponse.json({ ok: true });
});
