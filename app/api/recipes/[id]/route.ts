import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { deleteRecipe, saveRecipe } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { recipeInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withUser(async (userId, req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const recipe = await saveRecipe(await getDb(), userId, { id, ...recipeInput(await readJson(req)) });
  return NextResponse.json({ recipe });
});

export const DELETE = withUser(async (userId, _req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await deleteRecipe(await getDb(), userId, id);
  return NextResponse.json({ ok: true });
});
