import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { deleteCustomFood } from "@/lib/server/repo";
import { withUser } from "@/lib/server/session";

export const DELETE = withUser(async (userId, _req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await deleteCustomFood(await getDb(), userId, decodeURIComponent(id));
  return NextResponse.json({ ok: true });
});
