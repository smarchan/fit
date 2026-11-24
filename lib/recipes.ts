import type { Food, Per100, Recipe, RecipeDraft } from "./types";

type Sum = { kcal: number; protein: number; carbs: number; fat: number; grams: number };

/** Totals of the whole recipe, from the per-100 g values of each ingredient. */
export function recipeSum(items: RecipeDraft["items"]): Sum {
  const t: Sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, grams: 0 };
  for (const i of items) {
    const f = i.grams / 100;
    t.kcal += i.kcal * f;
    t.protein += i.protein * f;
    t.carbs += i.carbs * f;
    t.fat += i.fat * f;
    t.grams += i.grams;
  }
  return t;
}

/** Weight the nutrition is spread over: the cooked weight if the user gave one, else the sum of ingredients. */
export function recipeWeight(r: Pick<RecipeDraft, "items" | "totalG">): number {
  return r.totalG && r.totalG > 0 ? r.totalG : recipeSum(r.items).grams;
}

export function recipePerServing(r: Pick<RecipeDraft, "items" | "servings">): Per100 {
  const t = recipeSum(r.items);
  const n = r.servings > 0 ? r.servings : 1;
  return { kcal: t.kcal / n, protein: t.protein / n, carbs: t.carbs / n, fat: t.fat / n };
}

export const recipeFoodId = (id: string) => `r:${id}`;
export const isRecipeFood = (id: string | null | undefined) => !!id && id.startsWith("r:");

/** A recipe seen as a food, so it goes through the same diary entries: nutrition per 100 g and one serving = weight / servings. */
export function recipeAsFood(r: Pick<Recipe, "id" | "name" | "servings" | "totalG" | "items">): Food {
  const t = recipeSum(r.items);
  const w = recipeWeight(r) || 100;
  const k = 100 / w;
  const n = r.servings > 0 ? r.servings : 1;
  return {
    id: recipeFoodId(r.id),
    name: r.name,
    brand: "Receta",
    kcal: t.kcal * k,
    protein: t.protein * k,
    carbs: t.carbs * k,
    fat: t.fat * k,
    sugars: null,
    satFat: null,
    fiber: null,
    salt: null,
    servingG: Math.round((w / n) * 10) / 10,
    servingLabel: n === 1 ? "la receta entera" : `1 de ${n} raciones`,
    quantity: null,
    nutriscore: null,
    nova: null,
    image: r.items.find((i) => i.image)?.image ?? null,
    ingredients: r.items.map((i) => i.name).join(", "),
    allergens: [],
  };
}
