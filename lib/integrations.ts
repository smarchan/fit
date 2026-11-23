import type { Intensity, KcalSource, WorkoutDetails, WorkoutType } from "./types";
import { estimateWorkout, netFromGross } from "./energy.ts";
import { localDate } from "./validate.ts";

export interface Imported {
  source: "hevy" | "strava";
  externalId: string;
  date: string;
  type: WorkoutType;
  title: string | null;
  minutes: number;
  intensity: Intensity;
  distanceKm: number | null;
  kcal: number;
  kcalSource: KcalSource;
  startAt: string | null;
  details: WorkoutDetails | null;
}

/* ---------------- Hevy ---------------- */

interface HevySet {
  type?: string;
  weight_kg?: number | null;
  reps?: number | null;
}
interface HevyWorkout {
  id: string;
  title?: string;
  start_time: string;
  end_time: string;
  exercises?: { title?: string; sets?: HevySet[] }[];
}

/** Hevy has no calories: estimated as moderate resistance training over the session length (rests included). */
export function mapHevy(w: HevyWorkout, weightKg: number, tz: string): Imported | null {
  const start = new Date(w.start_time);
  const end = new Date(w.end_time);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return null;
  let sets = 0;
  let volume = 0;
  for (const ex of w.exercises ?? []) {
    for (const s of ex.sets ?? []) {
      if (s.type === "warmup") continue;
      sets++;
      volume += (s.weight_kg ?? 0) * (s.reps ?? 0);
    }
  }
  const est = estimateWorkout({ type: "gimnasio", intensity: "moderado", minutes }, weightKg);
  return {
    source: "hevy",
    externalId: w.id,
    date: localDate(start, tz),
    type: "gimnasio",
    title: w.title?.slice(0, 80) || "Entreno",
    minutes,
    intensity: "moderado",
    distanceKm: null,
    kcal: est.kcal,
    kcalSource: est.source,
    startAt: start.toISOString(),
    details: {
      sets,
      volumeKg: Math.round(volume),
      exercises: (w.exercises ?? []).map((e) => e.title ?? "").filter(Boolean).slice(0, 12),
    },
  };
}

/* ---------------- Strava ---------------- */

export interface StravaActivity {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  start_date_local: string;
  moving_time: number;
  elapsed_time?: number;
  distance?: number;
  kilojoules?: number;
  calories?: number;
  average_heartrate?: number;
  total_elevation_gain?: number;
}

const STRAVA_TYPES: Record<string, WorkoutType> = {
  Ride: "bici",
  VirtualRide: "bici",
  EBikeRide: "bici",
  GravelRide: "bici",
  MountainBikeRide: "bici",
  EMountainBikeRide: "bici",
  Velomobile: "bici",
  Handcycle: "bici",
  Run: "correr",
  TrailRun: "correr",
  VirtualRun: "correr",
  Swim: "natacion",
  WeightTraining: "gimnasio",
  Crossfit: "hiit",
  HighIntensityIntervalTraining: "hiit",
  Walk: "caminar",
  Hike: "caminar",
  Boxing: "boxeo",
  Kickboxing: "boxeo",
};

export function stravaType(a: Pick<StravaActivity, "sport_type" | "type">): WorkoutType {
  return STRAVA_TYPES[a.sport_type ?? ""] ?? STRAVA_TYPES[a.type ?? ""] ?? "otro";
}

/**
 * kcal priority: the device's calories (detailed activity) → power meter kilojoules (≈ gross kcal at ~24 % efficiency)
 * → our own estimate. Device numbers are gross, so resting expenditure is removed.
 */
export function mapStrava(a: StravaActivity, weightKg: number): Imported | null {
  const minutes = Math.round((a.moving_time || a.elapsed_time || 0) / 60);
  if (minutes <= 0) return null;
  const type = stravaType(a);
  const distanceKm = a.distance && a.distance > 0 ? Math.round(a.distance / 10) / 100 : null;
  let kcal: number;
  let kcalSource: KcalSource;
  if (a.calories && a.calories > 0) {
    kcal = netFromGross(a.calories, minutes, weightKg);
    kcalSource = "device";
  } else if (a.kilojoules && a.kilojoules > 0) {
    kcal = netFromGross(a.kilojoules, minutes, weightKg);
    kcalSource = "device";
  } else {
    const est = estimateWorkout({ type, intensity: "moderado", minutes, distanceKm }, weightKg);
    kcal = est.kcal;
    kcalSource = est.source;
  }
  const details: WorkoutDetails = {};
  if (a.average_heartrate) details.avgHr = Math.round(a.average_heartrate);
  if (a.total_elevation_gain) details.elevationM = Math.round(a.total_elevation_gain);
  return {
    source: "strava",
    externalId: String(a.id),
    // start_date_local is the athlete's wall-clock time with a misleading "Z" suffix.
    date: a.start_date_local.slice(0, 10),
    type,
    title: a.name?.slice(0, 80) || null,
    minutes,
    intensity: "moderado",
    distanceKm,
    kcal,
    kcalSource,
    startAt: new Date(a.start_date).toISOString(),
    details: Object.keys(details).length ? details : null,
  };
}

/** True if [start, start+minutes] overlaps any range by more than half of the shorter one. */
export function overlaps(startIso: string, minutes: number, ranges: { start: number; end: number }[]): boolean {
  const s = new Date(startIso).getTime();
  const e = s + minutes * 60000;
  return ranges.some((r) => {
    const o = Math.min(e, r.end) - Math.max(s, r.start);
    return o > 0.5 * Math.min(e - s, r.end - r.start);
  });
}
