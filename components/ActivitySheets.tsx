"use client";

import { useState } from "react";
import type { Body, Intensity, Workout, WorkoutType } from "@/lib/types";
import { INTENSITY_LABEL, WORKOUT_LABEL, WORKOUT_TYPES } from "@/lib/types";
import { estimateWorkout, stepKcal, weightOf, STEP_BASELINE } from "@/lib/energy";
import { api, fmt } from "@/lib/client";
import { NumInput, parseNum, Sheet } from "./ui";
import { ITrash, IWorkout } from "./icons";

const DISTANCE_TYPES: WorkoutType[] = ["correr", "caminar", "bici", "natacion"];

export function WorkoutSheet({ date, body, workout, onClose, onSaved }: { date: string; body: Body; workout?: Workout; onClose: () => void; onSaved: (msg: string) => void }) {
  const [type, setType] = useState<WorkoutType>(workout?.type ?? "gimnasio");
  const [intensity, setIntensity] = useState<Intensity>(workout?.intensity ?? "moderado");
  const [minutes, setMinutes] = useState(workout ? String(workout.minutes) : "60");
  const [distance, setDistance] = useState(workout?.distanceKm ? String(workout.distanceKm).replace(".", ",") : "");
  const [manual, setManual] = useState(workout?.kcalSource === "manual" ? String(workout.kcal) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const imported = workout && workout.source !== "manual";

  const min = parseNum(minutes) ?? 0;
  const km = DISTANCE_TYPES.includes(type) ? parseNum(distance) : null;
  const est = estimateWorkout({ type, intensity, minutes: min, distanceKm: km }, weightOf(body));
  const manualK = parseNum(manual);
  const kcal = manualK ?? (imported && workout.kcalSource === "device" ? workout.kcal : est.kcal);

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const payload = {
        date: workout?.date ?? date,
        type,
        intensity,
        minutes: min,
        distanceKm: km,
        title: workout?.title ?? null,
        // Device kcal of an imported workout are kept unless the user typed their own.
        kcal: manualK ?? (imported && workout.kcalSource === "device" ? workout.kcal : null),
      };
      if (workout) await api(`/api/workouts/${workout.id}`, { method: "PUT", body: payload });
      else await api("/api/workouts", { method: "POST", body: payload });
      onSaved(workout ? "Entreno actualizado" : `+${fmt(kcal)} kcal de ${WORKOUT_LABEL[type].toLowerCase()}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!workout) return;
    setBusy(true);
    await api(`/api/workouts/${workout.id}`, { method: "DELETE" });
    onSaved("Entreno eliminado");
  };

  return (
    <Sheet
      title={workout ? workout.title || WORKOUT_LABEL[workout.type] : "Añadir entreno"}
      onClose={onClose}
      footer={
        <>
          {workout && (
            <button className="btn danger" style={{ flex: "0 0 auto" }} onClick={remove} disabled={busy} aria-label="Eliminar">
              <ITrash size={18} />
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy || min <= 0}>
            {workout ? "Guardar" : "Añadir"}
          </button>
        </>
      }
    >
      <div className="types" role="group" aria-label="Tipo">
        {WORKOUT_TYPES.map((t) => (
          <button key={t} className="type" aria-pressed={type === t} onClick={() => setType(t)}>
            <IWorkout type={t} size={24} />
            {WORKOUT_LABEL[t]}
          </button>
        ))}
      </div>
      <div className={DISTANCE_TYPES.includes(type) ? "row" : undefined}>
        <div className="field">
          <label>Duración</label>
          <NumInput value={minutes} onChange={setMinutes} suffix="min" inputMode="numeric" />
        </div>
        {DISTANCE_TYPES.includes(type) && (
          <div className="field">
            <label>Distancia</label>
            <NumInput value={distance} onChange={setDistance} suffix="km" placeholder="Opcional" />
          </div>
        )}
      </div>
      <div className="field">
        <label>Intensidad</label>
        <div className="seg">
          {(["suave", "moderado", "intenso"] as const).map((i) => (
            <button key={i} aria-pressed={intensity === i} onClick={() => setIntensity(i)}>
              {INTENSITY_LABEL[i]}
            </button>
          ))}
        </div>
      </div>
      <div className="est">
        <span className="v num">{fmt(kcal)}</span>
        <span className="muted">kcal quemadas</span>
      </div>
      <div className="field">
        <label>¿Tu reloj dice otra cifra?</label>
        <NumInput value={manual} onChange={setManual} suffix="kcal" placeholder="Opcional" inputMode="numeric" />
        <div className="hint">Si la pones, se usa en lugar de la estimación. Cuenta sólo las activas, no las totales.</div>
      </div>
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}

export function StepsSheet({ date, body, steps, workouts, onClose, onSaved, onSetup }: { date: string; body: Body; steps: number; workouts: Workout[]; onClose: () => void; onSaved: (msg: string) => void; onSetup: () => void }) {
  const [v, setV] = useState(steps ? String(steps) : "");
  const [busy, setBusy] = useState(false);
  const n = parseNum(v) ?? 0;
  const kcal = stepKcal(n, workouts, weightOf(body));
  const save = async () => {
    setBusy(true);
    await api("/api/steps", { method: "PUT", body: { date, steps: Math.round(n) } });
    onSaved("Pasos guardados");
  };
  return (
    <Sheet
      title="Pasos"
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={save} disabled={busy}>
          Guardar
        </button>
      }
    >
      <NumInput value={v} onChange={setV} suffix="pasos" inputMode="numeric" autoFocus />
      <div className="est" style={{ background: "var(--steps-soft)", borderColor: "rgba(16,185,129,.3)" }}>
        <span className="v num" style={{ color: "var(--steps)" }}>+{fmt(kcal)}</span>
        <span className="muted">kcal a tu objetivo</span>
      </div>
      <div className="hint">
        Los primeros {fmt(STEP_BASELINE)} pasos ya van en tu base. Los de los entrenos de correr y caminar se descuentan para no contarlos dos veces.
      </div>
      <button className="btn block" onClick={onSetup}>
        Sincronizar con Apple Salud
      </button>
    </Sheet>
  );
}

export function WeightSheet({ date, current, onClose, onSaved }: { date: string; current: number | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const [v, setV] = useState(current ? String(current).replace(".", ",") : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (kg: number | null) => {
    setBusy(true);
    try {
      await api("/api/weight", { method: "PUT", body: { date, kg } });
      onSaved(kg == null ? "Peso eliminado" : "Peso guardado");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Sheet
      title="Peso"
      onClose={onClose}
      footer={
        <>
          {current != null && (
            <button className="btn danger" style={{ flex: "0 0 auto" }} onClick={() => save(null)} disabled={busy} aria-label="Eliminar">
              <ITrash size={18} />
            </button>
          )}
          <button className="btn primary" onClick={() => save(parseNum(v))} disabled={busy || parseNum(v) == null}>
            Guardar
          </button>
        </>
      }
    >
      <NumInput value={v} onChange={setV} suffix="kg" autoFocus />
      <div className="hint">Tu objetivo de calorías y proteína se recalcula con el último peso.</div>
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}
