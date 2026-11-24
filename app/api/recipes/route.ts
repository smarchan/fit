import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { listRecipes, saveRecipe } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { recipeInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId) => {
  return NextResponse.json({ recipes: await listRecipes(await getDb(), userId) });
});

export const POST = withUser(async (userId, req: Request) => {
  const recipe = await saveRecipe(await getDb(), userId, recipeInput(await readJson(req)));
  return NextResponse.json({ recipe });
});
