import type { Body, Entry, Food, Intensity, Meal, Recipe, RecipeItem, WorkoutType } from "./types";
import { MEALS, WORKOUT_TYPES } from "./types.ts";

export class Invalid extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function date(v: unknown): string {
  if (typeof v !== "string" || !DATE_RE.test(v)) throw new Invalid("Fecha no válida");
  const d = new Date(v + "T12:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) throw new Invalid("Fecha no válida");
  return v;
}

export function num(v: unknown, name: string, min: number, max: number): number {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (v === null || v === undefined || v === "" || !Number.isFinite(n) || n < min || n > max) throw new Invalid(`${name} no válido`);
  return n;
}

export function optNum(v: unknown, name: string, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  return num(v, name, min, max);
}

export function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export function oneOf<T extends string>(v: unknown, opts: readonly T[], name: string): T {
  if (typeof v !== "string" || !opts.includes(v as T)) throw new Invalid(`${name} no válido`);
  return v as T;
}

const INTENSITIES: Intensity[] = ["suave", "moderado", "intenso"];

export function per100(v: Record<string, unknown>) {
  return {
    kcal: num(v.kcal, "Calorías", 0, 950),
    protein: num(v.protein ?? 0, "Proteína", 0, 100),
    carbs: num(v.carbs ?? 0, "Hidratos", 0, 100),
    fat: num(v.fat ?? 0, "Grasa", 0, 100),
  };
}

/** A diary entry as sent by the client. Nutrition is per 100 g, snapshotted so later food edits don't rewrite history. */
export function entryInput(v: Record<string, unknown>): Omit<Entry, "id"> {
  const name = str(v.name, 160);
  if (!name) throw new Invalid("Falta el nombre");
  return {
    date: date(v.date),
    meal: oneOf<Meal>(v.meal, MEALS, "Comida"),
    foodId: str(v.foodId, 80),
    name,
    brand: str(v.brand, 120),
    grams: num(v.grams, "Cantidad", 0.1, 5000),
    image: safeUrl(v.image),
    ...per100(v),
  };
}

export interface EntryPatch {
  grams?: number;
  meal?: Meal;
  date?: string;
  name?: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

/** Any field of a logged entry can be corrected afterwards. Nutrition values are per 100 g. */
export function entryPatch(v: Record<string, unknown>): EntryPatch {
  const out: EntryPatch = {};
  if (v.grams !== undefined) out.grams = num(v.grams, "Cantidad", 0.1, 5000);
  if (v.meal !== undefined) out.meal = oneOf<Meal>(v.meal, MEALS, "Comida");
  if (v.date !== undefined) out.date = date(v.date);
  if (v.name !== undefined) {
    const name = str(v.name, 160);
    if (!name) throw new Invalid("Falta el nombre");
    out.name = name;
  }
  if (v.kcal !== undefined) out.kcal = num(v.kcal, "Calorías", 0, 950);
  if (v.protein !== undefined) out.protein = num(v.protein, "Proteína", 0, 100);
  if (v.carbs !== undefined) out.carbs = num(v.carbs, "Hidratos", 0, 100);
  if (v.fat !== undefined) out.fat = num(v.fat, "Grasa", 0, 100);
  return out;
}

/** Targets typed for one day: calories and/or grams. A null field goes back to automatic. */
export function dayGoalInput(v: Record<string, unknown>): { date: string; kcal: number | null; protein: number | null; carbs: number | null; fat: number | null } {
  return {
    date: date(v.date),
    kcal: optNum(v.kcal, "Calorías", 500, 10000),
    protein: optNum(v.protein, "Proteína", 0, 600),
    carbs: optNum(v.carbs, "Hidratos", 0, 1500),
    fat: optNum(v.fat, "Grasa", 0, 600),
  };
}

export function recipeInput(v: Record<string, unknown>): Omit<Recipe, "id" | "updatedAt"> {
  const name = str(v.name, 120);
  if (!name) throw new Invalid("Falta el nombre");
  if (!Array.isArray(v.items) || v.items.length === 0) throw new Invalid("Añade al menos un ingrediente");
  if (v.items.length > 60) throw new Invalid("Demasiados ingredientes");
  const items = v.items.map((raw): RecipeItem => {
    const i = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const n = str(i.name, 160);
    if (!n) throw new Invalid("Falta el nombre de un ingrediente");
    return { foodId: str(i.foodId, 80), name: n, brand: str(i.brand, 120), grams: num(i.grams, "Cantidad", 0.1, 20000), image: safeUrl(i.image), ...per100(i) };
  });
  return { name, servings: num(v.servings ?? 1, "Raciones", 0.25, 200), totalG: optNum(v.totalG, "Peso final", 1, 50000), items };
}

export interface WorkoutPayload {
  date: string;
  type: WorkoutType;
  intensity: Intensity;
  minutes: number;
  distanceKm: number | null;
  title: string | null;
  /** Typed by the user (from a watch, for example); null = estimate. */
  kcal: number | null;
}

export function workoutInput(v: Record<string, unknown>): WorkoutPayload {
  return {
    date: date(v.date),
    type: oneOf<WorkoutType>(v.type, WORKOUT_TYPES, "Tipo"),
    intensity: oneOf<Intensity>(v.intensity ?? "moderado", INTENSITIES, "Intensidad"),
    minutes: num(v.minutes, "Duración", 1, 1440),
    distanceKm: optNum(v.distanceKm, "Distancia", 0, 500),
    title: str(v.title, 80),
    kcal: optNum(v.kcal, "Calorías", 0, 10000),
  };
}

export function profileInput(v: Record<string, unknown>): Partial<Body> & { tz?: string; onboarded?: boolean } {
  const out: Partial<Body> & { tz?: string; onboarded?: boolean } = {};
  if ("sex" in v) out.sex = v.sex == null || v.sex === "" ? null : oneOf(v.sex, ["m", "f"] as const, "Sexo");
  if ("birthYear" in v) out.birthYear = optNum(v.birthYear, "Año de nacimiento", 1900, new Date().getFullYear() - 10);
  if ("heightCm" in v) out.heightCm = optNum(v.heightCm, "Altura", 100, 250);
  if ("weightKg" in v) out.weightKg = optNum(v.weightKg, "Peso", 30, 300);
  if ("baseKcal" in v) out.baseKcal = optNum(v.baseKcal, "Calorías base", 800, 6000);
  if ("goalDelta" in v) out.goalDelta = num(v.goalDelta, "Objetivo", -1500, 1500);
  if ("eatBack" in v) out.eatBack = num(v.eatBack, "Entrenos", 0, 1);
  if ("proteinPerKg" in v) out.proteinPerKg = num(v.proteinPerKg, "Proteína", 0.5, 4);
  if ("fatPct" in v) out.fatPct = num(v.fatPct, "Grasa", 0.1, 0.6);
  if ("proteinG" in v) out.proteinG = optNum(v.proteinG, "Proteína", 0, 600);
  if ("carbsG" in v) out.carbsG = optNum(v.carbsG, "Hidratos", 0, 1500);
  if ("fatG" in v) out.fatG = optNum(v.fatG, "Grasa", 0, 600);
  if ("tz" in v && typeof v.tz === "string" && isTz(v.tz)) out.tz = v.tz;
  if ("onboarded" in v) out.onboarded = Boolean(v.onboarded);
  return out;
}

export function foodInput(v: Record<string, unknown>): Omit<Food, "id"> {
  const name = str(v.name, 160);
  if (!name) throw new Invalid("Falta el nombre");
  return {
    name,
    brand: str(v.brand, 120),
    ...per100(v),
    sugars: optNum(v.sugars, "Azúcares", 0, 100),
    satFat: optNum(v.satFat, "Saturadas", 0, 100),
    fiber: optNum(v.fiber, "Fibra", 0, 100),
    salt: optNum(v.salt, "Sal", 0, 100),
    servingG: optNum(v.servingG, "Ración", 1, 2000),
    servingLabel: str(v.servingLabel, 40),
    quantity: null,
    nutriscore: null,
    nova: null,
    image: null,
    ingredients: null,
    allergens: [],
  };
}

export function isTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function safeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString().slice(0, 400) : null;
  } catch {
    return null;
  }
}

/** Calendar date of an instant in a time zone, as YYYY-MM-DD. */
export function localDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}
