"use client";

import { useMemo, useState } from "react";
import type { DayData, Entry, Meal, Profile, Workout } from "@/lib/types";
import { MEALS, MEAL_LABEL, WORKOUT_LABEL } from "@/lib/types";
import { budget, macroTargets, nutrition, totals, type Budget } from "@/lib/energy";
import { ago, api, fmt } from "@/lib/client";
import { NumInput, parseNum, Ring, useTween } from "./ui";
import { IBook, IEdit, IFoot, IPlus, IScale, IWorkout } from "./icons";

export interface TodayActions {
  addFood: (meal: Meal) => void;
  editEntry: (e: Entry) => void;
  addWorkout: () => void;
  editWorkout: (w: Workout) => void;
  editSteps: () => void;
  editWeight: () => void;
  copyMeal: (meal: Meal) => void;
  editGoal: () => void;
  mealToRecipe: (meal: Meal) => void;
}

export function useBudget(profile: Profile, day: DayData) {
  return useMemo(() => {
    const b = budget(profile, day.steps?.steps ?? 0, day.workouts, undefined, day.goal?.kcal ?? null);
    const t = totals(day.entries);
    return { b, t, m: macroTargets(profile, b.target, day.goal) };
  }, [profile, day]);
}

export default function Today({ profile, day, isToday, actions }: { profile: Profile; day: DayData; isToday: boolean; actions: TodayActions }) {
  const { b, t, m } = useBudget(profile, day);
  return (
    <div className="cols">
      <div className="stack">
        <Hero b={b} consumed={t.kcal} onEdit={actions.editGoal} />
        <div className="card">
          <div className="card-h">
            <span className="card-t">Macros</span>
            <span className="spacer" />
            <button className="icon-btn" onClick={actions.editGoal} aria-label="Editar objetivo del día">
              <IEdit size={16} />
            </button>
          </div>
          <div className="macros">
            <MacroBar name="Proteína" v={t.protein} max={m.protein} color="var(--protein)" />
            <MacroBar name="Hidratos" v={t.carbs} max={m.carbs} color="var(--carbs)" />
            <MacroBar name="Grasa" v={t.fat} max={m.fat} color="var(--fat)" />
          </div>
        </div>
        <div className="grid-2">
          <button className="card act" onClick={actions.editSteps}>
            <span className="act-ico" style={{ background: "var(--steps-soft)", color: "var(--steps)" }}>
              <IFoot size={18} />
            </span>
            <span className="act-big num">{fmt(day.steps?.steps ?? 0)}</span>
            <span className="act-sub">{day.steps ? (day.steps.source === "atajo" ? `Apple Salud · ${ago(day.steps.updatedAt)}` : "Manual") : isToday ? "Toca para añadir" : "Sin pasos"}</span>
            <span className="mini-bar">
              <span style={{ width: `${Math.min(100, ((day.steps?.steps ?? 0) / 10000) * 100)}%` }} />
            </span>
            {b.steps > 0 && <span className="act-plus" style={{ color: "var(--steps)" }}>+{fmt(b.steps)} kcal</span>}
          </button>
          <button className="card act" onClick={actions.editWeight}>
            <span className="act-ico" style={{ background: "rgba(124,58,237,.1)", color: "var(--protein)" }}>
              <IScale size={18} />
            </span>
            <span className="act-big num">
              {day.weight != null ? fmt(day.weight, 1) : profile.weightKg != null ? fmt(profile.weightKg, 1) : "—"}
              <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 600 }}> kg</span>
            </span>
            <span className="act-sub">{day.weight != null ? "Pesado este día" : "Toca para registrar"}</span>
          </button>
        </div>
        <div className="card">
          <div className="card-h">
            <span className="card-t">Entrenos</span>
            {b.workouts > 0 && (
              <span className="muted" style={{ fontSize: 13 }}>
                · <b style={{ color: "var(--burn)" }}>{fmt(b.workouts)}</b> kcal
              </span>
            )}
            <span className="spacer" />
            <button className="add-btn" style={{ background: "var(--burn-soft)", color: "var(--burn)" }} onClick={actions.addWorkout} aria-label="Añadir entreno">
              <IPlus size={18} />
            </button>
          </div>
          {day.workouts.length === 0 ? (
            <div className="meal-empty">Bici, boxeo, correr, natación, gimnasio… o vincula Hevy y Strava en Ajustes.</div>
          ) : (
            <div className="wlist">
              {day.workouts.map((w) => (
                <button key={w.id} className="wrow" onClick={() => actions.editWorkout(w)}>
                  <span className="ico">
                    <IWorkout type={w.type} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="t" style={{ display: "block" }}>{w.title || WORKOUT_LABEL[w.type]}</span>
                    <span className="s">
                      {w.source !== "manual" && <span className={`src ${w.source}`}>{w.source}</span>}
                      {fmt(w.minutes)} min
                      {w.distanceKm ? ` · ${fmt(w.distanceKm, 1)} km` : ""}
                      {w.details?.volumeKg ? ` · ${fmt(w.details.volumeKg)} kg` : ""}
                      {w.details?.sets ? ` · ${w.details.sets} series` : ""}
                    </span>
                  </span>
                  <span className="k num">
                    {fmt(w.kcal)}
                    <small>kcal</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="stack">
        {MEALS.map((meal) => (
          <MealCard key={meal} meal={meal} entries={day.entries.filter((e) => e.meal === meal)} actions={actions} />
        ))}
      </div>
    </div>
  );
}

function Hero({ b, consumed, onEdit }: { b: Budget; consumed: number; onEdit: () => void }) {
  const remaining = b.target - consumed;
  const over = remaining < 0;
  const shown = useTween(Math.abs(remaining));
  const burned = b.steps + b.workouts;
  const total = Math.max(1, b.base + Math.max(0, b.goal) + b.steps + b.workoutsCounted);
  return (
    <div className={`card hero${over ? " over" : ""}`}>
      <div className="ring-wrap">
        <Ring size={232} stroke={18} value={consumed} max={b.target} color={over ? "var(--over)" : "var(--accent)"} />
        <div className="ring-center">
          <div className="ring-big num" style={over ? { color: "var(--over)" } : undefined}>
            {fmt(shown)}
          </div>
          <div className="ring-lbl">{over ? "kcal por encima" : "kcal restantes"}</div>
        </div>
      </div>
      <div className="hero-stats">
        <button className="hs hs-btn" onClick={onEdit} aria-label="Editar objetivo del día">
          <div className="v num">{fmt(b.target)}</div>
          <div className="k">
            Objetivo
            <IEdit size={12} />
          </div>
        </button>
        <div className="hs">
          <div className="v num">{fmt(consumed)}</div>
          <div className="k">
            <i style={{ background: "var(--accent)" }} />
            Comido
          </div>
        </div>
        <div className="hs">
          <div className="v num" style={{ color: burned ? "var(--burn)" : undefined }}>{fmt(burned)}</div>
          <div className="k">
            <i style={{ background: "var(--burn)" }} />
            Quemado
          </div>
        </div>
      </div>
      {b.manual ? (
        <div className="equation">
          <div className="eq-items">
            <span>
              <i style={{ background: "var(--accent)" }} />
              Objetivo fijado por ti · automático <b className="num">{fmt(b.auto)}</b>
            </span>
          </div>
        </div>
      ) : (
      <div className="equation">
        <div className="eq-bar" aria-hidden="true">
          <span style={{ flexGrow: b.base, background: "var(--line-strong)" }} />
          {b.goal > 0 && <span style={{ flexGrow: b.goal, background: "var(--accent)" }} />}
          {b.steps > 0 && <span style={{ flexGrow: b.steps, background: "var(--steps)" }} />}
          {b.workoutsCounted > 0 && <span style={{ flexGrow: b.workoutsCounted, background: "var(--burn)" }} />}
          <span style={{ flexGrow: total * 0.0001 }} />
        </div>
        <div className="eq-items">
          <span>
            <i style={{ background: "var(--line-strong)" }} />
            Base <b className="num">{fmt(b.base)}</b>
          </span>
          {b.goal !== 0 && (
            <span>
              <i style={{ background: b.goal > 0 ? "var(--accent)" : "var(--over)" }} />
              {b.goal > 0 ? "Volumen" : "Déficit"} <b className="num">{b.goal > 0 ? "+" : "−"}{fmt(Math.abs(b.goal))}</b>
            </span>
          )}
          <span>
            <i style={{ background: "var(--steps)" }} />
            Pasos <b className="num">+{fmt(b.steps)}</b>
          </span>
          <span>
            <i style={{ background: "var(--burn)" }} />
            Entrenos <b className="num">+{fmt(b.workoutsCounted)}</b>
          </span>
        </div>
      </div>
      )}
    </div>
  );
}

function MacroBar({ name, v, max, color }: { name: string; v: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (v / max) * 100) : 0;
  const left = Math.round(max - v);
  return (
    <div className="macro-row">
      <span className="name">{name}</span>
      <span className="val num">
        <b>{fmt(v)}</b> / {fmt(max)} g{" "}
        <span className="faint">· {left >= 0 ? `quedan ${fmt(left)}` : `+${fmt(-left)}`}</span>
      </span>
      <span className="bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </span>
    </div>
  );
}

function MealCard({ meal, entries, actions }: { meal: Meal; entries: Entry[]; actions: TodayActions }) {
  const t = totals(entries);
  return (
    <div className="card meal">
      <div className="meal-h">
        <span className="meal-t">{MEAL_LABEL[meal]}</span>
        {entries.length > 0 && <span className="meal-k num">{fmt(t.kcal)} kcal</span>}
        <span className="spacer" />
        {entries.length > 0 && (
          <span className="meal-macros num hide-xs">
            <span style={{ color: "var(--protein)" }}>{fmt(t.protein)}</span>
            <span style={{ color: "var(--carbs)" }}>{fmt(t.carbs)}</span>
            <span style={{ color: "var(--fat)" }}>{fmt(t.fat)}</span>
          </span>
        )}
        <button className="add-btn" onClick={() => actions.addFood(meal)} aria-label={`Añadir a ${MEAL_LABEL[meal]}`}>
          <IPlus size={18} />
        </button>
      </div>
      {entries.length === 0 ? (
        <button className="meal-empty" style={{ border: 0, background: "transparent", padding: "6px 0 10px", cursor: "pointer" }} onClick={() => actions.copyMeal(meal)}>
          Copiar de ayer
        </button>
      ) : (
        <ul className="entries">
          {entries.map((e) => {
            const n = nutrition(e, e.grams);
            return (
              <li key={e.id} className="entry" onClick={() => actions.editEntry(e)} role="button" tabIndex={0} onKeyDown={(k) => k.key === "Enter" && actions.editEntry(e)}>
                <span className="thumb">{e.image ? <img src={e.image} alt="" loading="lazy" /> : e.name.charAt(0).toUpperCase()}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="n" style={{ display: "block" }}>{e.name}</span>
                  <span className="d" style={{ display: "block" }}>{[e.brand, `${fmt(e.grams)} g`].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="k num">{fmt(n.kcal)}</span>
              </li>
            );
          })}
        </ul>
      )}
      {entries.length > 1 && (
        <button className="meal-save" onClick={() => actions.mealToRecipe(meal)}>
          <IBook size={14} />
          Guardar como receta
        </button>
      )}
    </div>
  );
}

/* ---------------- Onboarding ---------------- */

export function Onboarding({ profile, onDone }: { profile: Profile; onDone: (p: Profile) => void }) {
  const [sex, setSex] = useState<"m" | "f" | null>(profile.sex);
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : "");
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : "");
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : "");
  const [goal, setGoal] = useState(profile.goalDelta);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const { profile: p } = await api<{ profile: Profile }>("/api/profile", {
        method: "PUT",
        body: { sex, birthYear: parseNum(birthYear), heightCm: parseNum(height), weightKg: parseNum(weight), goalDelta: goal, onboarded: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      onDone(p);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const ok = sex && parseNum(birthYear) && parseNum(height) && parseNum(weight);
  return (
    <div className="card onb stack">
      <div>
        <h2>Tu punto de partida</h2>
        <div className="muted" style={{ fontSize: 14 }}>Con esto calculo tu gasto base. Luego tus pasos y entrenos lo suben cada día.</div>
      </div>
      <div className="seg">
        <button aria-pressed={sex === "m"} onClick={() => setSex("m")}>Hombre</button>
        <button aria-pressed={sex === "f"} onClick={() => setSex("f")}>Mujer</button>
      </div>
      <div className="row-3">
        <div className="field">
          <label>Nacimiento</label>
          <NumInput value={birthYear} onChange={setBirthYear} placeholder="2004" inputMode="numeric" />
        </div>
        <div className="field">
          <label>Altura</label>
          <NumInput value={height} onChange={setHeight} suffix="cm" inputMode="numeric" />
        </div>
        <div className="field">
          <label>Peso</label>
          <NumInput value={weight} onChange={setWeight} suffix="kg" />
        </div>
      </div>
      <div className="field">
        <label>Objetivo</label>
        <div className="seg">
          {(
            [
              [-400, "Perder"],
              [0, "Mantener"],
              [250, "Ganar"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} aria-pressed={goal === v} onClick={() => setGoal(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary block" onClick={save} disabled={!ok || busy}>
        Empezar
      </button>
    </div>
  );
}
