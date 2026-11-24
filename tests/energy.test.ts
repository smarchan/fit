import { test } from "node:test";
import assert from "node:assert/strict";
import { bmr, budget, estimateWorkout, macroTargets, netFromGross, stepKcal, suggestedBase, totals, workoutSteps } from "../lib/energy.ts";
import type { Body } from "../lib/types";

const now = new Date("2026-11-23T12:00:00Z");
const body: Body = {
  sex: "m",
  birthYear: 2004,
  heightCm: 180,
  weightKg: 80,
  baseKcal: null,
  goalDelta: 0,
  eatBack: 1,
  proteinPerKg: 2,
  fatPct: 0.25,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

test("Mifflin–St Jeor BMR and sedentary base", () => {
  // 10·80 + 6.25·180 − 5·22 + 5 = 1820
  assert.equal(bmr(body, now), 1820);
  assert.equal(suggestedBase(body, now), 2180); // 1820 × 1.2 = 2184 → 2180
  assert.equal(bmr({ ...body, sex: "f" }, now), 1654);
  assert.equal(bmr({ ...body, heightCm: null }, now), null);
});

test("steps below the sedentary baseline add nothing", () => {
  assert.equal(stepKcal(2000, [], 80), 0);
  assert.equal(stepKcal(2500, [], 80), 0);
});

test("steps above the baseline add net kcal proportional to weight", () => {
  // 10 000 − 2 500 = 7 500 × 80 × 0.00037 = 222
  assert.equal(stepKcal(10000, [], 80), 222);
  assert.equal(stepKcal(10000, [], 60), 167);
});

test("running steps are not counted twice", () => {
  const run = { type: "correr" as const, minutes: 30, distanceKm: 6 };
  assert.equal(workoutSteps(run), 7200);
  // 12 000 − 2 500 − 7 200 = 2 300 extra steps
  assert.equal(stepKcal(12000, [run], 80), 68);
  // cycling adds no steps
  assert.equal(workoutSteps({ type: "bici", minutes: 60, distanceKm: 25 }), 0);
});

test("workout estimate subtracts resting MET", () => {
  // gym moderate 5 MET → 4 net × 80 kg × 1 h
  assert.deepEqual(estimateWorkout({ type: "gimnasio", intensity: "moderado", minutes: 60 }, 80), { kcal: 320, source: "met" });
  // running with distance uses 1 kcal/kg/km
  assert.deepEqual(estimateWorkout({ type: "correr", intensity: "moderado", minutes: 30, distanceKm: 6 }, 80), { kcal: 480, source: "distance" });
  // boxing intense, 45 min: 11.8 × 80 × 0.75 = 708
  assert.equal(estimateWorkout({ type: "boxeo", intensity: "intenso", minutes: 45 }, 80).kcal, 708);
});

test("device kcal are converted to net", () => {
  assert.equal(netFromGross(700, 60, 80), 620);
  assert.equal(netFromGross(50, 60, 80), 0);
});

test("budget adds base, goal, steps and the eaten-back share of workouts", () => {
  const w = [{ type: "gimnasio" as const, minutes: 60, distanceKm: null, kcal: 320 }];
  const b = budget({ ...body, goalDelta: -300, eatBack: 0.5 }, 10000, w, now);
  assert.deepEqual(b, { base: 2180, goal: -300, steps: 222, workouts: 320, workoutsCounted: 160, maintenance: 2562, custom: false, target: 2262 });
});

test("manual base overrides the estimate and target never drops below 1200", () => {
  assert.equal(budget({ ...body, baseKcal: 2500 }, 0, [], now).target, 2500);
  assert.equal(budget({ ...body, baseKcal: 1300, goalDelta: -800 }, 0, [], now).target, 1200);
});

test("macro targets fill the remaining kcal with carbs", () => {
  const m = macroTargets(body, 2400);
  assert.deepEqual(m, { kcal: 2400, protein: 160, fat: 61, carbs: 303 });
  assert.ok(Math.abs(m.protein * 4 + m.fat * 9 + m.carbs * 4 - 2400) < 10);
});

test("totals scale per-100 g values by grams", () => {
  const t = totals([
    { kcal: 100, protein: 10, carbs: 5, fat: 2, grams: 250 },
    { kcal: 400, protein: 0, carbs: 100, fat: 0, grams: 50 },
  ]);
  assert.deepEqual(t, { kcal: 450, protein: 25, carbs: 62.5, fat: 5 });
});
