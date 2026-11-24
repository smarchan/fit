export type Sex = "m" | "f";
export type Meal = "desayuno" | "comida" | "merienda" | "cena" | "snacks";
export type WorkoutType = "bici" | "boxeo" | "correr" | "natacion" | "gimnasio" | "caminar" | "hiit" | "otro";
export type Intensity = "suave" | "moderado" | "intenso";
export type WorkoutSource = "manual" | "hevy" | "strava";
/** How a workout's kcal were obtained: MET table, distance formula, the device (Strava), or typed by the user. */
export type KcalSource = "met" | "distance" | "device" | "manual";

export const MEALS: Meal[] = ["desayuno", "comida", "merienda", "cena", "snacks"];
export const MEAL_LABEL: Record<Meal, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  merienda: "Merienda",
  cena: "Cena",
  snacks: "Snacks",
};
export const WORKOUT_TYPES: WorkoutType[] = ["gimnasio", "correr", "bici", "natacion", "boxeo", "caminar", "hiit", "otro"];
export const WORKOUT_LABEL: Record<WorkoutType, string> = {
  bici: "Bici",
  boxeo: "Boxeo",
  correr: "Correr",
  natacion: "Natación",
  gimnasio: "Gimnasio",
  caminar: "Caminar",
  hiit: "HIIT",
  otro: "Otro",
};
export const INTENSITY_LABEL: Record<Intensity, string> = { suave: "Suave", moderado: "Moderado", intenso: "Intenso" };

/** Inputs the energy maths need. */
export interface Body {
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Sedentary daily expenditure typed by the user; null = estimate from body data. */
  baseKcal: number | null;
  /** Added to the target every day: negative to lose weight, positive to gain. */
  goalDelta: number;
  /** Share (0–1) of workout kcal added back to the target. */
  eatBack: number;
  proteinPerKg: number;
  /** Share (0–1) of the target that comes from fat. */
  fatPct: number;
  /** Own gram targets. null = calculated (protein from g/kg, fat from %, carbs the remainder). */
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

/** Settings typed for one specific day. Any field left null stays automatic. */
export interface DayGoal {
  /** Deficit (negative) or surplus (positive) for this day, instead of the one in settings. */
  delta: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface RecipeItem extends Per100 {
  foodId: string | null;
  name: string;
  brand: string | null;
  /** Raw amount in the recipe. */
  grams: number;
  image: string | null;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  /** Final weight of the cooked dish; null = sum of the ingredients. */
  totalG: number | null;
  items: RecipeItem[];
  updatedAt: string;
}

export type RecipeDraft = Omit<Recipe, "id" | "updatedAt"> & { id?: string };

export interface Profile extends Body {
  tz: string;
  hevy: boolean;
  strava: { name: string } | null;
  stepToken: boolean;
  onboarded: boolean;
}

export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food extends Per100 {
  /** Barcode, "g:<slug>" for built-in generic foods or "c:<uuid>" for the user's own. */
  id: string;
  name: string;
  brand: string | null;
  sugars: number | null;
  satFat: number | null;
  fiber: number | null;
  salt: number | null;
  servingG: number | null;
  servingLabel: string | null;
  quantity: string | null;
  nutriscore: string | null;
  nova: number | null;
  image: string | null;
  ingredients: string | null;
  allergens: string[];
}

export interface Entry extends Per100 {
  id: string;
  date: string;
  meal: Meal;
  foodId: string | null;
  name: string;
  brand: string | null;
  grams: number;
  image: string | null;
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  title: string | null;
  minutes: number;
  intensity: Intensity;
  distanceKm: number | null;
  /** Net kcal: expenditure above resting, which the base already covers. */
  kcal: number;
  kcalSource: KcalSource;
  source: WorkoutSource;
  startAt: string | null;
  details: WorkoutDetails | null;
}

export interface WorkoutDetails {
  sets?: number;
  volumeKg?: number;
  exercises?: string[];
  avgHr?: number;
  elevationM?: number;
}

export interface Steps {
  steps: number;
  source: "atajo" | "manual";
  updatedAt: string;
}

export interface DayData {
  date: string;
  entries: Entry[];
  workouts: Workout[];
  steps: Steps | null;
  weight: number | null;
  goal: DayGoal | null;
}

export interface HistoryDay {
  date: string;
  consumed: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: number;
  workoutKcal: number;
  workoutMin: number;
  target: number;
  weight: number | null;
  logged: boolean;
}
