import "server-only";
import { estimateWorkout, weightOf } from "../energy";
import type { Body } from "../types";
import type { WorkoutPayload } from "../validate";
import type { WorkoutWrite } from "./repo";

export function toWrite(w: WorkoutPayload, body: Body): WorkoutWrite {
  const est = estimateWorkout(w, weightOf(body));
  return {
    date: w.date,
    type: w.type,
    title: w.title,
    minutes: w.minutes,
    intensity: w.intensity,
    distanceKm: w.distanceKm,
    kcal: w.kcal != null ? Math.round(w.kcal) : est.kcal,
    kcalSource: w.kcal != null ? "manual" : est.source,
  };
}
