import "server-only";
import type { Db } from "./db";
import type { Body, DayData, DayGoal, Entry, Food, HistoryDay, Profile, Recipe, RecipeDraft, RecipeItem, Steps, Workout, WorkoutDetails } from "../types";
import type { EntryPatch } from "../validate";
import { budget, totals } from "../energy";
import { newId } from "./crypto";
import { addDays } from "../dates";
import { Invalid } from "../validate";

type Row = Record<string, unknown>;

const n = (v: unknown) => (v == null ? null : Number(v));
const s = (v: unknown) => (v == null ? null : String(v));
const iso = (v: unknown) => (v == null ? null : new Date(v as string).toISOString());

export const DEFAULT_BODY: Body = {
  sex: null,
  birthYear: null,
  heightCm: null,
  weightKg: null,
  baseKcal: null,
  goalDelta: 0,
  eatBack: 0.75,
  proteinPerKg: 1.8,
  fatPct: 0.27,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

/* ---------------- Profile ---------------- */

export interface ProfileRow extends Profile {
  hevyKeyEnc: string | null;
  stravaAccessEnc: string | null;
  stravaRefreshEnc: string | null;
  stravaExpiresAt: number | null;
  syncedAt: string | null;
}

export async function getProfile(db: Db, userId: string): Promise<ProfileRow> {
  const [r] = await db.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  if (!r) {
    return {
      ...DEFAULT_BODY,
      tz: "Europe/Madrid",
      hevy: false,
      strava: null,
      stepToken: false,
      onboarded: false,
      hevyKeyEnc: null,
      stravaAccessEnc: null,
      stravaRefreshEnc: null,
      stravaExpiresAt: null,
      syncedAt: null,
    };
  }
  return {
    sex: r.sex === "m" || r.sex === "f" ? r.sex : null,
    birthYear: n(r.birth_year),
    heightCm: n(r.height_cm),
    weightKg: n(r.weight_kg),
    baseKcal: n(r.base_kcal),
    goalDelta: Number(r.goal_delta),
    eatBack: Number(r.eat_back),
    proteinPerKg: Number(r.protein_per_kg),
    fatPct: Number(r.fat_pct),
    proteinG: n(r.protein_g),
    carbsG: n(r.carbs_g),
    fatG: n(r.fat_g),
    tz: String(r.tz),
    onboarded: Boolean(r.onboarded),
    hevy: r.hevy_key != null,
    strava: r.strava_refresh != null ? { name: String(r.strava_name ?? "Strava") } : null,
    stepToken: r.step_token_hash != null,
    hevyKeyEnc: s(r.hevy_key),
    stravaAccessEnc: s(r.strava_access),
    stravaRefreshEnc: s(r.strava_refresh),
    stravaExpiresAt: n(r.strava_expires_at),
    syncedAt: iso(r.synced_at),
  };
}

/** Public view of a profile: never sends tokens to the browser. */
export function publicProfile(p: ProfileRow): Profile {
  const { hevyKeyEnc, stravaAccessEnc, stravaRefreshEnc, stravaExpiresAt, syncedAt, ...rest } = p;
  void hevyKeyEnc, stravaAccessEnc, stravaRefreshEnc, stravaExpiresAt, syncedAt;
  return rest;
}

const PROFILE_COLS: Record<string, string> = {
  sex: "sex",
  birthYear: "birth_year",
  heightCm: "height_cm",
  weightKg: "weight_kg",
  baseKcal: "base_kcal",
  goalDelta: "goal_delta",
  eatBack: "eat_back",
  proteinPerKg: "protein_per_kg",
  fatPct: "fat_pct",
  proteinG: "protein_g",
  carbsG: "carbs_g",
  fatG: "fat_g",
  tz: "tz",
  onboarded: "onboarded",
  stepTokenHash: "step_token_hash",
  hevyKeyEnc: "hevy_key",
  stravaAthleteId: "strava_athlete_id",
  stravaName: "strava_name",
  stravaAccessEnc: "strava_access",
  stravaRefreshEnc: "strava_refresh",
  stravaExpiresAt: "strava_expires_at",
  syncedAt: "synced_at",
};

export async function updateProfile(db: Db, userId: string, patch: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(patch).filter((k) => k in PROFILE_COLS && patch[k] !== undefined);
  if (!keys.length) {
    await db.query("INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
    return;
  }
  const cols = keys.map((k) => PROFILE_COLS[k]);
  const vals = keys.map((k) => patch[k]);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");
  await db.query(
    `INSERT INTO profiles (user_id, ${cols.join(", ")}) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")})
     ON CONFLICT (user_id) DO UPDATE SET ${sets}, updated_at = now()`,
    [userId, ...vals],
  );
}

export async function userByStepToken(db: Db, hash: string): Promise<{ userId: string; tz: string } | null> {
  const [r] = await db.query("SELECT user_id, tz FROM profiles WHERE step_token_hash = $1", [hash]);
  return r ? { userId: String(r.user_id), tz: String(r.tz) } : null;
}

/* ---------------- Day ---------------- */

const ENTRY_SELECT = `SELECT id, to_char(date, 'YYYY-MM-DD') AS date, meal, food_id, name, brand, grams, kcal, protein, carbs, fat, image FROM entries`;
const WORKOUT_SELECT = `SELECT id, to_char(date, 'YYYY-MM-DD') AS date, type, title, minutes, intensity, distance_km, kcal, kcal_source, source, start_at, details FROM workouts`;

function rowToEntry(r: Row): Entry {
  return {
    id: String(r.id),
    date: String(r.date),
    meal: r.meal as Entry["meal"],
    foodId: s(r.food_id),
    name: String(r.name),
    brand: s(r.brand),
    grams: Number(r.grams),
    kcal: Number(r.kcal),
    protein: Number(r.protein),
    carbs: Number(r.carbs),
    fat: Number(r.fat),
    image: s(r.image),
  };
}

function rowToWorkout(r: Row): Workout {
  return {
    id: String(r.id),
    date: String(r.date),
    type: r.type as Workout["type"],
    title: s(r.title),
    minutes: Number(r.minutes),
    intensity: r.intensity as Workout["intensity"],
    distanceKm: n(r.distance_km),
    kcal: Number(r.kcal),
    kcalSource: r.kcal_source as Workout["kcalSource"],
    source: r.source as Workout["source"],
    startAt: iso(r.start_at),
    details: (typeof r.details === "string" ? JSON.parse(r.details) : r.details) as WorkoutDetails | null,
  };
}

export async function getDay(db: Db, userId: string, date: string): Promise<DayData> {
  const [entries, workouts, steps, weight, goal] = await Promise.all([
    db.query(`${ENTRY_SELECT} WHERE user_id = $1 AND date = $2 ORDER BY created_at`, [userId, date]),
    db.query(`${WORKOUT_SELECT} WHERE user_id = $1 AND date = $2 AND NOT hidden ORDER BY coalesce(start_at, created_at)`, [userId, date]),
    db.query("SELECT steps, source, updated_at FROM steps WHERE user_id = $1 AND date = $2", [userId, date]),
    db.query("SELECT kg FROM weights WHERE user_id = $1 AND date = $2", [userId, date]),
    db.query("SELECT kcal, protein, carbs, fat FROM day_goals WHERE user_id = $1 AND date = $2", [userId, date]),
  ]);
  return {
    date,
    entries: entries.map(rowToEntry),
    workouts: workouts.map(rowToWorkout),
    steps: steps[0] ? { steps: Number(steps[0].steps), source: steps[0].source as Steps["source"], updatedAt: iso(steps[0].updated_at)! } : null,
    weight: weight[0] ? Number(weight[0].kg) : null,
    goal: goal[0] ? { kcal: n(goal[0].kcal), protein: n(goal[0].protein), carbs: n(goal[0].carbs), fat: n(goal[0].fat) } : null,
  };
}

/** Targets typed for one day. All-null removes the row, so the day goes back to automatic. */
export async function setDayGoal(db: Db, userId: string, date: string, g: DayGoal): Promise<void> {
  if (g.kcal == null && g.protein == null && g.carbs == null && g.fat == null) {
    await db.query("DELETE FROM day_goals WHERE user_id = $1 AND date = $2", [userId, date]);
    return;
  }
  await db.query(
    `INSERT INTO day_goals (user_id, date, kcal, protein, carbs, fat) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, date) DO UPDATE SET kcal = EXCLUDED.kcal, protein = EXCLUDED.protein, carbs = EXCLUDED.carbs, fat = EXCLUDED.fat`,
    [userId, date, g.kcal, g.protein, g.carbs, g.fat],
  );
}

/* ---------------- Entries ---------------- */

export async function addEntry(db: Db, userId: string, e: Omit<Entry, "id">): Promise<Entry> {
  const id = newId();
  await db.query(
    `INSERT INTO entries (id, user_id, date, meal, food_id, name, brand, grams, kcal, protein, carbs, fat, image)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [id, userId, e.date, e.meal, e.foodId, e.name, e.brand, e.grams, e.kcal, e.protein, e.carbs, e.fat, e.image],
  );
  return { id, ...e };
}

export async function updateEntry(db: Db, userId: string, id: string, p: EntryPatch): Promise<boolean> {
  const rows = await db.query(
    `UPDATE entries SET grams = coalesce($3, grams), meal = coalesce($4, meal), date = coalesce($5::date, date), name = coalesce($6, name),
       kcal = coalesce($7, kcal), protein = coalesce($8, protein), carbs = coalesce($9, carbs), fat = coalesce($10, fat)
     WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId, p.grams ?? null, p.meal ?? null, p.date ?? null, p.name ?? null, p.kcal ?? null, p.protein ?? null, p.carbs ?? null, p.fat ?? null],
  );
  return rows.length > 0;
}

export async function deleteEntry(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db.query("DELETE FROM entries WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
  return rows.length > 0;
}

/** Copies every entry of one meal (or the whole day) from one date to another. */
export async function copyEntries(db: Db, userId: string, from: string, to: string, meal: string | null): Promise<number> {
  const rows = await db.query(`${ENTRY_SELECT} WHERE user_id = $1 AND date = $2 AND ($3::text IS NULL OR meal = $3) ORDER BY created_at`, [userId, from, meal]);
  for (const r of rows) await addEntry(db, userId, { ...rowToEntry(r), date: to });
  return rows.length;
}

export interface RecentFood {
  food: Food;
  grams: number;
  count: number;
}

/** Most frequently logged foods in the last 60 days, with the last amount used. */
export async function recentFoods(db: Db, userId: string): Promise<RecentFood[]> {
  const rows = await db.query(
    `SELECT DISTINCT ON (k) k, food_id, name, brand, grams, kcal, protein, carbs, fat, image, cnt FROM (
       SELECT coalesce(food_id, 'n:' || lower(name)) AS k, food_id, name, brand, grams, kcal, protein, carbs, fat, image, created_at,
              count(*) OVER (PARTITION BY coalesce(food_id, 'n:' || lower(name))) AS cnt
       FROM entries WHERE user_id = $1 AND date > current_date - 60
     ) t ORDER BY k, created_at DESC`,
    [userId],
  );
  return rows
    .map((r) => ({
      grams: Number(r.grams),
      count: Number(r.cnt),
      food: {
        id: s(r.food_id) ?? `n:${String(r.name)}`,
        name: String(r.name),
        brand: s(r.brand),
        kcal: Number(r.kcal),
        protein: Number(r.protein),
        carbs: Number(r.carbs),
        fat: Number(r.fat),
        image: s(r.image),
        sugars: null,
        satFat: null,
        fiber: null,
        salt: null,
        servingG: null,
        servingLabel: null,
        quantity: null,
        nutriscore: null,
        nova: null,
        ingredients: null,
        allergens: [],
      } satisfies Food,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

/* ---------------- Foods (OFF cache + custom) ---------------- */

export async function cachedFood(db: Db, id: string, maxAgeDays = 30): Promise<Food | null> {
  const [r] = await db.query(`SELECT data FROM foods WHERE id = $1 AND (owner IS NOT NULL OR fetched_at > now() - ($2 || ' days')::interval)`, [id, String(maxAgeDays)]);
  if (!r) return null;
  return (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as Food;
}

export async function cacheFood(db: Db, food: Food): Promise<void> {
  await db.query(
    `INSERT INTO foods (id, owner, data) VALUES ($1, NULL, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, fetched_at = now() WHERE foods.owner IS NULL`,
    [food.id, JSON.stringify(food)],
  );
}

export async function saveCustomFood(db: Db, userId: string, food: Food): Promise<void> {
  await db.query(
    `INSERT INTO foods (id, owner, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data WHERE foods.owner = EXCLUDED.owner`,
    [food.id, userId, JSON.stringify(food)],
  );
}

export async function customFoods(db: Db, userId: string): Promise<Food[]> {
  const rows = await db.query("SELECT data FROM foods WHERE owner = $1 ORDER BY fetched_at DESC", [userId]);
  return rows.map((r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as Food);
}

export async function deleteCustomFood(db: Db, userId: string, id: string): Promise<void> {
  await db.query("DELETE FROM foods WHERE id = $1 AND owner = $2", [id, userId]);
}

/* ---------------- Recipes ---------------- */

function rowToRecipe(r: Row): Recipe {
  const items = (typeof r.items === "string" ? JSON.parse(r.items) : r.items) as RecipeItem[];
  return { id: String(r.id), name: String(r.name), servings: Number(r.servings), totalG: n(r.total_g), items, updatedAt: iso(r.updated_at)! };
}

export async function listRecipes(db: Db, userId: string): Promise<Recipe[]> {
  const rows = await db.query("SELECT id, name, servings, total_g, items, updated_at FROM recipes WHERE user_id = $1 ORDER BY lower(name)", [userId]);
  return rows.map(rowToRecipe);
}

export async function saveRecipe(db: Db, userId: string, r: RecipeDraft): Promise<Recipe> {
  if (r.id) {
    const rows = await db.query(
      `UPDATE recipes SET name = $3, servings = $4, total_g = $5, items = $6, updated_at = now()
       WHERE id = $1 AND user_id = $2 RETURNING id, name, servings, total_g, items, updated_at`,
      [r.id, userId, r.name, r.servings, r.totalG, JSON.stringify(r.items)],
    );
    if (!rows[0]) throw new Invalid("La receta no existe");
    return rowToRecipe(rows[0]);
  }
  const rows = await db.query(
    `INSERT INTO recipes (id, user_id, name, servings, total_g, items) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, name, servings, total_g, items, updated_at`,
    [newId(), userId, r.name, r.servings, r.totalG, JSON.stringify(r.items)],
  );
  return rowToRecipe(rows[0]);
}

export async function deleteRecipe(db: Db, userId: string, id: string): Promise<void> {
  await db.query("DELETE FROM recipes WHERE id = $1 AND user_id = $2", [id, userId]);
}

/* ---------------- Workouts ---------------- */

export interface WorkoutWrite {
  date: string;
  type: Workout["type"];
  title: string | null;
  minutes: number;
  intensity: Workout["intensity"];
  distanceKm: number | null;
  kcal: number;
  kcalSource: Workout["kcalSource"];
}

export async function addWorkout(db: Db, userId: string, w: WorkoutWrite): Promise<string> {
  const id = newId();
  await db.query(
    `INSERT INTO workouts (id, user_id, date, type, title, minutes, intensity, distance_km, kcal, kcal_source, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'manual')`,
    [id, userId, w.date, w.type, w.title, w.minutes, w.intensity, w.distanceKm, w.kcal, w.kcalSource],
  );
  return id;
}

export async function updateWorkout(db: Db, userId: string, id: string, w: WorkoutWrite): Promise<boolean> {
  const rows = await db.query(
    `UPDATE workouts SET date = $3, type = $4, title = $5, minutes = $6, intensity = $7, distance_km = $8, kcal = $9, kcal_source = $10
     WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId, w.date, w.type, w.title, w.minutes, w.intensity, w.distanceKm, w.kcal, w.kcalSource],
  );
  return rows.length > 0;
}

/** Manual workouts are deleted; imported ones are hidden so the next sync doesn't bring them back. */
export async function deleteWorkout(db: Db, userId: string, id: string): Promise<boolean> {
  const del = await db.query("DELETE FROM workouts WHERE id = $1 AND user_id = $2 AND source = 'manual' RETURNING id", [id, userId]);
  if (del.length) return true;
  const hid = await db.query("UPDATE workouts SET hidden = true WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
  return hid.length > 0;
}

export interface ExternalWorkout extends WorkoutWrite {
  source: "hevy" | "strava";
  externalId: string;
  startAt: string | null;
  details: WorkoutDetails | null;
}

/** Inserts or refreshes an imported workout. Keeps the user's edits to intensity/kcal only if they typed kcal by hand. */
export async function upsertExternal(db: Db, userId: string, w: ExternalWorkout): Promise<void> {
  await db.query(
    `INSERT INTO workouts (id, user_id, date, type, title, minutes, intensity, distance_km, kcal, kcal_source, source, external_id, start_at, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (user_id, source, external_id) DO UPDATE SET
       date = EXCLUDED.date, title = EXCLUDED.title, minutes = EXCLUDED.minutes, distance_km = EXCLUDED.distance_km,
       start_at = EXCLUDED.start_at, details = EXCLUDED.details,
       kcal = CASE WHEN workouts.kcal_source = 'manual' THEN workouts.kcal ELSE EXCLUDED.kcal END,
       kcal_source = CASE WHEN workouts.kcal_source = 'manual' THEN workouts.kcal_source ELSE EXCLUDED.kcal_source END`,
    [newId(), userId, w.date, w.type, w.title, w.minutes, w.intensity, w.distanceKm, w.kcal, w.kcalSource, w.source, w.externalId, w.startAt, w.details ? JSON.stringify(w.details) : null],
  );
}

/** Time ranges of imported workouts, to skip duplicates across sources (a Hevy session also logged on Strava). */
export async function importedRanges(db: Db, userId: string, source: string, sinceIso: string): Promise<{ start: number; end: number }[]> {
  const rows = await db.query(
    "SELECT start_at, minutes FROM workouts WHERE user_id = $1 AND source = $2 AND start_at >= $3",
    [userId, source, sinceIso],
  );
  return rows.map((r) => {
    const start = new Date(r.start_at as string).getTime();
    return { start, end: start + Number(r.minutes) * 60000 };
  });
}

export async function removeSource(db: Db, userId: string, source: "hevy" | "strava"): Promise<void> {
  await db.query("DELETE FROM workouts WHERE user_id = $1 AND source = $2", [userId, source]);
}

/* ---------------- Steps & weight ---------------- */

export async function setSteps(db: Db, userId: string, date: string, steps: number, source: Steps["source"]): Promise<void> {
  await db.query(
    `INSERT INTO steps (user_id, date, steps, source) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, date) DO UPDATE SET steps = EXCLUDED.steps, source = EXCLUDED.source, updated_at = now()`,
    [userId, date, Math.round(steps), source],
  );
}

export async function setWeight(db: Db, userId: string, date: string, kg: number | null): Promise<void> {
  if (kg == null) {
    await db.query("DELETE FROM weights WHERE user_id = $1 AND date = $2", [userId, date]);
  } else {
    await db.query(`INSERT INTO weights (user_id, date, kg) VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET kg = EXCLUDED.kg`, [userId, date, kg]);
  }
  // The profile weight follows the most recent weigh-in.
  const [last] = await db.query("SELECT kg FROM weights WHERE user_id = $1 ORDER BY date DESC LIMIT 1", [userId]);
  if (last) await updateProfile(db, userId, { weightKg: Number(last.kg) });
}

/* ---------------- History ---------------- */

export async function history(db: Db, userId: string, body: Body, from: string, to: string): Promise<HistoryDay[]> {
  const [entries, workouts, steps, weights, goals] = await Promise.all([
    db.query(`SELECT to_char(date, 'YYYY-MM-DD') AS date, grams, kcal, protein, carbs, fat FROM entries WHERE user_id = $1 AND date BETWEEN $2 AND $3`, [userId, from, to]),
    db.query(`${WORKOUT_SELECT} WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND NOT hidden`, [userId, from, to]),
    db.query(`SELECT to_char(date, 'YYYY-MM-DD') AS date, steps FROM steps WHERE user_id = $1 AND date BETWEEN $2 AND $3`, [userId, from, to]),
    db.query(`SELECT to_char(date, 'YYYY-MM-DD') AS date, kg FROM weights WHERE user_id = $1 AND date BETWEEN $2 AND $3`, [userId, from, to]),
    db.query(`SELECT to_char(date, 'YYYY-MM-DD') AS date, kcal FROM day_goals WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND kcal IS NOT NULL`, [userId, from, to]),
  ]);
  const by = <T>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return m;
  };
  const e = by(entries, (r) => String(r.date));
  const w = by(workouts.map(rowToWorkout), (r) => r.date);
  const st = new Map(steps.map((r) => [String(r.date), Number(r.steps)]));
  const wt = new Map(weights.map((r) => [String(r.date), Number(r.kg)]));
  const gk = new Map(goals.map((r) => [String(r.date), Number(r.kcal)]));

  const out: HistoryDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const de = (e.get(d) ?? []).map((r) => ({ grams: Number(r.grams), kcal: Number(r.kcal), protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat) }));
    const dw = w.get(d) ?? [];
    const t = totals(de);
    const b = budget(body, st.get(d) ?? 0, dw, undefined, gk.get(d) ?? null);
    out.push({
      date: d,
      consumed: Math.round(t.kcal),
      protein: Math.round(t.protein),
      carbs: Math.round(t.carbs),
      fat: Math.round(t.fat),
      steps: st.get(d) ?? 0,
      workoutKcal: b.workouts,
      workoutMin: Math.round(dw.reduce((x, y) => x + y.minutes, 0)),
      target: b.target,
      weight: wt.get(d) ?? null,
      logged: de.length > 0,
    });
  }
  return out;
}

export async function lastWeights(db: Db, userId: string, limit = 180): Promise<{ date: string; kg: number }[]> {
  const rows = await db.query(`SELECT to_char(date, 'YYYY-MM-DD') AS date, kg FROM weights WHERE user_id = $1 ORDER BY date DESC LIMIT $2`, [userId, limit]);
  return rows.map((r) => ({ date: String(r.date), kg: Number(r.kg) })).reverse();
}

/** Consecutive logged days ending today (or yesterday, if today has nothing yet). */
export async function streak(db: Db, userId: string, today: string): Promise<number> {
  const rows = await db.query(
    `SELECT DISTINCT to_char(date, 'YYYY-MM-DD') AS date FROM entries WHERE user_id = $1 AND date <= $2 AND date > $2::date - 400 ORDER BY date DESC`,
    [userId, today],
  );
  const set = new Set(rows.map((r) => String(r.date)));
  let d = set.has(today) ? today : addDays(today, -1);
  let k = 0;
  while (set.has(d)) {
    k++;
    d = addDays(d, -1);
  }
  return k;
}

export async function deleteAccount(db: Db, userId: string): Promise<void> {
  for (const t of ["entries", "workouts", "steps", "weights", "day_goals", "recipes"]) await db.query(`DELETE FROM ${t} WHERE user_id = $1`, [userId]);
  await db.query("DELETE FROM foods WHERE owner = $1", [userId]);
  await db.query("DELETE FROM profiles WHERE user_id = $1", [userId]);
}
