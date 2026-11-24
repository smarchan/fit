import { test } from "node:test";
import assert from "node:assert/strict";
import { budget, macroTargets } from "../lib/energy.ts";
import { recipeAsFood, recipePerServing, recipeSum, recipeWeight } from "../lib/recipes.ts";
import { dayGoalInput, entryPatch, Invalid, profileInput, recipeInput } from "../lib/validate.ts";
import type { Body } from "../lib/types";

const now = new Date("2026-11-23T12:00:00Z");
const body: Body = {
  sex: "m", birthYear: 2004, heightCm: 180, weightKg: 80, baseKcal: 2200, goalDelta: -300, eatBack: 1, proteinPerKg: 2, fatPct: 0.25,
  proteinG: null, carbsG: null, fatG: null,
};

test("a calorie target typed for the day replaces the calculation", () => {
  const auto = budget(body, 10000, [], now);
  assert.equal(auto.manual, false);
  assert.equal(auto.target, 2200 - 300 + 222);
  const manual = budget(body, 10000, [], now, 1800);
  assert.equal(manual.manual, true);
  assert.equal(manual.target, 1800);
  assert.equal(manual.auto, auto.target); // the calculated value stays available to show
  assert.equal(budget(body, 0, [], now, null).manual, false);
});

test("macro priority: day > settings > calculated", () => {
  const calc = macroTargets(body, 2000);
  assert.deepEqual(calc, { kcal: 2000, protein: 160, fat: 56, carbs: 214 });
  const own = macroTargets({ ...body, proteinG: 180 }, 2000);
  assert.equal(own.protein, 180);
  assert.equal(own.carbs, Math.round((2000 - 180 * 4 - 56 * 9) / 4));
  const day = macroTargets({ ...body, proteinG: 180 }, 2000, { protein: 200, carbs: 150, fat: null });
  assert.equal(day.protein, 200);
  assert.equal(day.carbs, 150);
  assert.equal(day.fat, 56);
});

const items = [
  { foodId: "g:arroz", name: "Arroz", brand: null, grams: 200, kcal: 350, protein: 7, carbs: 78, fat: 1, image: null },
  { foodId: null, name: "Pollo", brand: null, grams: 300, kcal: 120, protein: 23, carbs: 0, fat: 3, image: null },
];

test("recipe totals and per-serving values", () => {
  const t = recipeSum(items);
  assert.equal(t.grams, 500);
  assert.equal(t.kcal, 700 + 360);
  assert.equal(t.protein, 14 + 69);
  const ps = recipePerServing({ items, servings: 2 });
  assert.equal(ps.kcal, 530);
  assert.equal(ps.protein, 41.5);
});

test("a recipe becomes a food whose serving is weight / servings", () => {
  const r = { id: "abc", name: "Arroz con pollo", servings: 2, totalG: null, items };
  const f = recipeAsFood(r);
  assert.equal(f.id, "r:abc");
  assert.equal(f.servingG, 250);
  // 1 serving = 250 g → half of the total
  assert.ok(Math.abs((f.kcal * 250) / 100 - 530) < 1e-9);
  // cooked weight spreads the same nutrition over more grams
  const cooked = recipeAsFood({ ...r, totalG: 800 });
  assert.equal(recipeWeight({ items, totalG: 800 }), 800);
  assert.equal(cooked.servingG, 400);
  assert.ok(Math.abs((cooked.kcal * 400) / 100 - 530) < 1e-9);
});

test("validators", () => {
  assert.deepEqual(entryPatch({ grams: "150,5", name: " Yogur ", kcal: 60, date: "2026-11-20" }), { grams: 150.5, name: "Yogur", kcal: 60, date: "2026-11-20" });
  assert.throws(() => entryPatch({ name: "  " }), Invalid);
  assert.throws(() => entryPatch({ date: "2026-13-40" }), Invalid);
  assert.deepEqual(dayGoalInput({ date: "2026-11-23", kcal: 2500, protein: "", carbs: null }), { date: "2026-11-23", kcal: 2500, protein: null, carbs: null, fat: null });
  assert.throws(() => dayGoalInput({ date: "2026-11-23", kcal: 100 }), Invalid);
  assert.deepEqual(profileInput({ proteinG: 170, carbsG: "", fatG: null }), { proteinG: 170, carbsG: null, fatG: null });
  const r = recipeInput({ name: "Bowl", servings: 2, totalG: "", items: [{ name: "Avena", grams: 80, kcal: 370, protein: 13, carbs: 60, fat: 7 }] });
  assert.equal(r.totalG, null);
  assert.equal(r.items[0].grams, 80);
  assert.throws(() => recipeInput({ name: "Vacía", items: [] }), Invalid);
  assert.throws(() => recipeInput({ name: "", items }), Invalid);
});
