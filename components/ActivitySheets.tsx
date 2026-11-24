"use client";

import { useState } from "react";
import type { Body, DayGoal, Intensity, Workout, WorkoutType } from "@/lib/types";
import { INTENSITY_LABEL, WORKOUT_LABEL, WORKOUT_TYPES } from "@/lib/types";
import { estimateWorkout, macroTargets, stepKcal, weightOf, STEP_BASELINE } from "@/lib/energy";
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

/** Settings for one day: deficit/surplus and grams. Blank = what Ajustes says. */
export function GoalSheet({ date, body, maintenance, current, onClose, onSaved }: { date: string; body: Body; maintenance: number; current: DayGoal | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const str = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
  const [delta, setDelta] = useState(str(current?.delta));
  const [protein, setProtein] = useState(str(current?.protein));
  const [carbs, setCarbs] = useState(str(current?.carbs));
  const [fat, setFat] = useState(str(current?.fat));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const d = parseNum(delta);
  const eff = d ?? body.goalDelta;
  const target = Math.max(1200, maintenance + eff);
  // What each blank field would be, given the deficit/surplus typed so far.
  const calc = macroTargets(body, target, { protein: null, carbs: null, fat: null, delta: d });
  const any = [delta, protein, carbs, fat].some((x) => x.trim() !== "");

  const save = async (reset = false) => {
    setBusy(true);
    setErr("");
    try {
      const v = reset ? { delta: null, protein: null, carbs: null, fat: null } : { delta: d, protein: parseNum(protein), carbs: parseNum(carbs), fat: parseNum(fat) };
      await api("/api/goals", { method: "PUT", body: { date, ...v } });
      onSaved(reset || !any ? "Ajuste automático" : "Ajuste del día guardado");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const alwaysMacros = async () => {
    setBusy(true);
    setErr("");
    try {
      await api("/api/profile", { method: "PUT", body: { proteinG: parseNum(protein), carbsG: parseNum(carbs), fatG: parseNum(fat) } });
      await api("/api/goals", { method: "PUT", body: { date, delta: d, protein: null, carbs: null, fat: null } });
      onSaved("Gramos guardados para todos los días");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Objetivo del día"
      onClose={onClose}
      footer={
        <>
          {current && (
            <button className="btn ghost" style={{ flex: "0 0 auto" }} onClick={() => save(true)} disabled={busy}>
              Restablecer
            </button>
          )}
          <button className="btn primary" onClick={() => save()} disabled={busy}>
            Guardar
          </button>
        </>
      }
    >
      <div className="est" style={{ background: "var(--accent-soft)", borderColor: "rgba(37,99,235,.25)" }}>
        <span className="v num" style={{ color: "var(--accent)" }}>{fmt(target)}</span>
        <span className="muted">kcal · mantenimiento {fmt(maintenance)} {eff < 0 ? "−" : "+"} {fmt(Math.abs(eff))}</span>
      </div>
      <div className="field">
        <label htmlFor="g-k">Déficit o superávit de hoy</label>
        <NumInput id="g-k" value={delta} onChange={setDelta} suffix="kcal" placeholder={String(body.goalDelta)} inputMode="numeric" />
        <div className="chips">
          {[-500, -300, 0, 250, 500].map((v) => (
            <button key={v} className="chip" aria-pressed={d === v} onClick={() => setDelta(String(v))}>
              {v === 0 ? "Mantener" : v < 0 ? `Déficit ${-v}` : `Superávit ${v}`}
            </button>
          ))}
        </div>
        <div className="hint">Se suma al mantenimiento, que sube con tus pasos y entrenos. En blanco usa el de Ajustes ({body.goalDelta > 0 ? "+" : ""}{fmt(body.goalDelta)}).</div>
      </div>
      <div className="row-3">
        <div className="field">
          <label>Proteína</label>
          <NumInput value={protein} onChange={setProtein} suffix="g" placeholder={String(calc.protein)} inputMode="numeric" />
        </div>
        <div className="field">
          <label>Hidratos</label>
          <NumInput value={carbs} onChange={setCarbs} suffix="g" placeholder={String(calc.carbs)} inputMode="numeric" />
        </div>
        <div className="field">
          <label>Grasa</label>
          <NumInput value={fat} onChange={setFat} suffix="g" placeholder={String(calc.fat)} inputMode="numeric" />
        </div>
      </div>
      <div className="hint">Proteína y grasa se mantienen fijas; las calorías que añade o quita el día van a los hidratos.</div>
      {(protein.trim() !== "" || carbs.trim() !== "" || fat.trim() !== "") && (
        <button className="btn block" onClick={alwaysMacros} disabled={busy}>
          Usar estos gramos todos los días
        </button>
      )}
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}
