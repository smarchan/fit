import type { Body, Entry, Intensity, Per100, Workout, WorkoutType } from "./types";

/**
 * Energy model.
 *
 * target = base (sedentary expenditure, BMR × 1.2) + goal adjustment
 *        + steps above STEP_BASELINE (net of resting, minus steps already counted inside workouts)
 *        + eatBack × net workout kcal
 *
 * Everything is "net": resting expenditure (1 MET) is already inside the base, so steps and workouts
 * only add what they burn on top of it. That avoids counting the same calories twice.
 */

export const DEFAULT_WEIGHT = 75;
/** Steps a sedentary day (activity factor 1.2) already includes. */
export const STEP_BASELINE = 2500;
/** Net kcal per step per kg of body weight (≈ 0.5 kcal/kg/km walking at ~1350 steps/km). */
export const KCAL_PER_STEP_KG = 0.00037;
/** Steps per minute for workouts that also add steps on the phone/watch. */
const STEPS_PER_MIN: Partial<Record<WorkoutType, number>> = { correr: 165, caminar: 110 };
const STEPS_PER_KM: Partial<Record<WorkoutType, number>> = { correr: 1200, caminar: 1350 };
/** Net kcal per kg per km, used when a distance is known. */
const NET_KCAL_KG_KM: Partial<Record<WorkoutType, number>> = { correr: 1.0, caminar: 0.5 };

/** Compendium of Physical Activities (2011/2024) METs. */
export const MET: Record<WorkoutType, Record<Intensity, number>> = {
  bici: { suave: 4.0, moderado: 6.8, intenso: 10.0 },
  boxeo: { suave: 5.5, moderado: 7.8, intenso: 12.8 },
  correr: { suave: 7.0, moderado: 9.8, intenso: 11.8 },
  natacion: { suave: 5.8, moderado: 8.3, intenso: 9.8 },
  gimnasio: { suave: 3.5, moderado: 5.0, intenso: 6.0 },
  caminar: { suave: 3.0, moderado: 3.8, intenso: 5.0 },
  hiit: { suave: 4.3, moderado: 7.0, intenso: 8.0 },
  otro: { suave: 3.5, moderado: 5.0, intenso: 7.0 },
};

export const weightOf = (b: Pick<Body, "weightKg">) => (b.weightKg && b.weightKg > 0 ? b.weightKg : DEFAULT_WEIGHT);

export function ageOf(birthYear: number | null, now = new Date()): number | null {
  if (!birthYear) return null;
  return now.getFullYear() - birthYear;
}

/** Mifflin–St Jeor basal metabolic rate, or null if body data is missing. */
export function bmr(b: Body, now = new Date()): number | null {
  const age = ageOf(b.birthYear, now);
  if (!b.sex || !age || !b.heightCm || !b.weightKg) return null;
  return 10 * b.weightKg + 6.25 * b.heightCm - 5 * age + (b.sex === "m" ? 5 : -161);
}

export function suggestedBase(b: Body, now = new Date()): number | null {
  const v = bmr(b, now);
  return v == null ? null : Math.round((v * 1.2) / 10) * 10;
}

export function baseOf(b: Body, now = new Date()): number {
  return b.baseKcal ?? suggestedBase(b, now) ?? 2000;
}

export function round(n: number) {
  return Math.round(n);
}

export interface WorkoutInput {
  type: WorkoutType;
  intensity: Intensity;
  minutes: number;
  distanceKm?: number | null;
}

/** Net kcal for a workout from its type, intensity and duration (or distance, for running and walking). */
export function estimateWorkout(w: WorkoutInput, weightKg: number): { kcal: number; source: "met" | "distance" } {
  const perKm = NET_KCAL_KG_KM[w.type];
  if (perKm && w.distanceKm && w.distanceKm > 0) {
    return { kcal: round(perKm * weightKg * w.distanceKm), source: "distance" };
  }
  const met = MET[w.type][w.intensity];
  return { kcal: round(Math.max(0, met - 1) * weightKg * (w.minutes / 60)), source: "met" };
}

/** Converts a device's gross kcal (Strava) to net by removing resting expenditure. */
export function netFromGross(grossKcal: number, minutes: number, weightKg: number): number {
  return round(Math.max(0, grossKcal - weightKg * (minutes / 60)));
}

/** Steps a workout already put on the phone, so they are not counted again as steps. */
export function workoutSteps(w: Pick<Workout, "type" | "minutes" | "distanceKm">): number {
  const perKm = STEPS_PER_KM[w.type];
  if (perKm && w.distanceKm && w.distanceKm > 0) return round(perKm * w.distanceKm);
  const perMin = STEPS_PER_MIN[w.type];
  return perMin ? round(perMin * w.minutes) : 0;
}

export function stepKcal(steps: number, workouts: Pick<Workout, "type" | "minutes" | "distanceKm">[], weightKg: number): number {
  const counted = workouts.reduce((s, w) => s + workoutSteps(w), 0);
  const extra = Math.max(0, steps - STEP_BASELINE - counted);
  return round(extra * weightKg * KCAL_PER_STEP_KG);
}

export interface Budget {
  base: number;
  /** Deficit (negative) or surplus (positive) applied to maintenance. */
  goal: number;
  steps: number;
  /** Net kcal burned in workouts. */
  workouts: number;
  /** Part of `workouts` added to the target (eatBack). */
  workoutsCounted: number;
  /** Maintenance for the day: base + steps + workouts. Goes up with activity. */
  maintenance: number;
  /** True when the deficit/surplus was typed for this specific day. */
  custom: boolean;
  target: number;
}

/** target = maintenance (base + steps + workouts) + deficit/surplus. `deltaOverride` replaces the settings' deficit/surplus for one day. */
export function budget(
  b: Body,
  steps: number,
  workouts: Pick<Workout, "type" | "minutes" | "distanceKm" | "kcal">[],
  now = new Date(),
  deltaOverride: number | null = null,
): Budget {
  const kg = weightOf(b);
  const base = baseOf(b, now);
  const s = stepKcal(steps, workouts, kg);
  const w = workouts.reduce((t, x) => t + x.kcal, 0);
  const counted = round(w * clamp(b.eatBack, 0, 1));
  const maintenance = base + s + counted;
  const goal = deltaOverride ?? b.goalDelta;
  return { base, goal, steps: s, workouts: w, workoutsCounted: counted, maintenance, custom: deltaOverride != null, target: Math.max(1200, maintenance + goal) };
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Macro targets in grams. Protein and fat stay the same whatever the activity (fat is a share of the
 * no-activity calories: base + deficit/surplus), so everything the day adds or removes goes to carbs.
 * Priority per macro: typed for the day, typed in settings, calculated.
 */
export function macroTargets(b: Body, target: number, day?: { protein: number | null; carbs: number | null; fat: number | null; delta?: number | null } | null, now = new Date()): Macros {
  const resting = Math.max(1200, baseOf(b, now) + (day?.delta ?? b.goalDelta));
  const protein = day?.protein ?? b.proteinG ?? round(weightOf(b) * b.proteinPerKg);
  const fat = day?.fat ?? b.fatG ?? round((resting * clamp(b.fatPct, 0.1, 0.6)) / 9);
  const carbs = day?.carbs ?? b.carbsG ?? Math.max(0, round((target - protein * 4 - fat * 9) / 4));
  return { kcal: target, protein: round(protein), carbs: round(carbs), fat: round(fat) };
}

export function nutrition(per100: Per100, grams: number): Macros {
  const f = grams / 100;
  return { kcal: per100.kcal * f, protein: per100.protein * f, carbs: per100.carbs * f, fat: per100.fat * f };
}

export function totals(entries: Pick<Entry, "kcal" | "protein" | "carbs" | "fat" | "grams">[]): Macros {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    const n = nutrition(e, e.grams);
    t.kcal += n.kcal;
    t.protein += n.protein;
    t.carbs += n.carbs;
    t.fat += n.fat;
  }
  return t;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
