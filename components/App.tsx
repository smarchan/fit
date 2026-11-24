"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DayData, Entry, Food, HistoryDay, Meal, Profile, RecipeDraft, Workout } from "@/lib/types";
import { MEAL_LABEL } from "@/lib/types";
import { addDays, dayLabel, todayLocal, weekdayLetter } from "@/lib/dates";
import { api, mealNow } from "@/lib/client";
import { budget } from "@/lib/energy";
import Today, { Onboarding } from "./Today";
import AddFood, { entryPayload, FoodSheet, type AddTab } from "./AddFood";
import { RecipeEditor } from "./Recipes";
import { GoalSheet, StepsSheet, WeightSheet, WorkoutSheet } from "./ActivitySheets";
import Progress from "./Progress";
import Settings from "./Settings";
import Account from "./Account";
import { Ring, Toast } from "./ui";
import { IChart, IChevL, IChevR, IFlame, IHome, IScan, ISettings, IWorkout } from "./icons";

type Tab = "hoy" | "progreso" | "ajustes";
type SheetState =
  | { kind: "food"; meal: Meal; tab: AddTab }
  | { kind: "goal" }
  | { kind: "recipe"; draft: RecipeDraft; back: Meal | null }
  | { kind: "entry"; entry: Entry }
  | { kind: "workout"; workout?: Workout }
  | { kind: "steps" }
  | { kind: "weight" }
  | null;
type ToastState = { msg: string; action?: { label: string; run: () => void } } | null;

const STRAVA_MSG: Record<string, string> = {
  ok: "Strava vinculado",
  denied: "Has cancelado la conexión con Strava",
  scope: "Strava necesita permiso para ver tus actividades",
  config: "Strava no está configurado en el servidor",
  error: "No se pudo conectar con Strava",
};

export default function App({ devAuth }: { devAuth: boolean }) {
  const [tab, setTab] = useState<Tab>("hoy");
  const [today, setToday] = useState(todayLocal);
  const [date, setDate] = useState(todayLocal);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [day, setDay] = useState<DayData | null>(null);
  const [streak, setStreak] = useState(0);
  const [week, setWeek] = useState<HistoryDay[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [version, setVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const dateRef = useRef(date);
  dateRef.current = date;

  const say = useCallback((msg: string, action?: { label: string; run: () => void }) => setToast({ msg, action }), []);

  const load = useCallback(async (d = dateRef.current) => {
    try {
      const t = todayLocal();
      setToday(t);
      const r = await api<{ profile: Profile; day: DayData; streak: number }>(`/api/day?date=${d}&today=${t}`);
      if (d !== dateRef.current) return;
      setProfile(r.profile);
      setDay(r.day);
      setStreak(r.streak);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    return load();
  }, [load]);

  const sync = useCallback(
    async (force = false) => {
      setSyncing(true);
      try {
        const r = await api<{ hevy: number; strava: number; errors: string[]; skipped?: boolean }>("/api/sync", { method: "POST", body: { force } });
        if (r.errors.length) say(r.errors[0]);
        else if (force) say(`Sincronizado · ${r.hevy + r.strava} entrenos`);
        if (!r.skipped) await refresh();
      } catch {
        /* offline: try later */
      } finally {
        setSyncing(false);
      }
    },
    [refresh, say],
  );

  // URL params: ?tab=ajustes&strava=ok after the Strava OAuth round-trip.
  useEffect(() => {
    const u = new URL(window.location.href);
    const t = u.searchParams.get("tab");
    if (t === "ajustes" || t === "progreso") setTab(t);
    const s = u.searchParams.get("strava");
    if (s) say(STRAVA_MSG[s] ?? STRAVA_MSG.error);
    if (t || s) window.history.replaceState(null, "", "/");
  }, [say]);

  useEffect(() => {
    load(date);
  }, [date, load]);

  // Near real time: refresh when the app comes back to the foreground and every minute while visible.
  const hasIntegrations = !!(profile?.hevy || profile?.strava);
  useEffect(() => {
    if (hasIntegrations) sync();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (dateRef.current === today && todayLocal() !== today) setDate(todayLocal());
      load();
      if (hasIntegrations) sync();
    };
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(iv);
    };
  }, [hasIntegrations, load, sync, today]);

  // Week strip: Monday → Sunday around the selected date.
  const monday = useMemo(() => {
    const dow = (new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7;
    return addDays(date, -dow);
  }, [date]);
  useEffect(() => {
    api<{ days: HistoryDay[] }>(`/api/history?from=${monday}&to=${addDays(monday, 6)}`)
      .then((r) => setWeek(r.days))
      .catch(() => {});
  }, [monday, version]);

  const closeAndRefresh = (msg?: string) => {
    setSheet(null);
    if (msg) say(msg);
    refresh();
  };

  const isToday = date === today;
  const defaultMeal = (): Meal => (isToday ? mealNow() : "comida");

  if (error && !profile) {
    return (
      <main className="app">
        <div className="empty" style={{ paddingTop: 120 }}>
          <b>No se pudo cargar</b>
          {error}
          <div style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => load()}>Reintentar</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="top">
        {tab === "hoy" ? (
          <div className="day-nav" style={{ minWidth: 0 }}>
            <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior">
              <IChevL />
            </button>
            <button className="day-title" style={{ border: 0, background: "transparent", cursor: "pointer" }} onClick={() => setDate(today)}>
              {dayLabel(date, today)}
            </button>
            <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Día siguiente">
              <IChevR />
            </button>
          </div>
        ) : (
          <div className="day-title">{tab === "progreso" ? "Progreso" : "Ajustes"}</div>
        )}
        <span className="spacer" />
        {syncing && <span className="sync-dot" aria-label="Sincronizando" />}
        {streak > 0 && (
          <span className="streak" title="Días seguidos registrando">
            <IFlame size={15} />
            <span className="num">{streak}</span>
          </span>
        )}
      </header>

      {tab === "hoy" && (
        <>
          {profile && week.length === 7 && <WeekStrip days={week} selected={date} today={today} profile={profile} onPick={setDate} />}
          {!profile || !day ? (
            <div className="stack">
              <div className="skeleton" style={{ height: 380 }} />
              <div className="skeleton" style={{ height: 140 }} />
            </div>
          ) : (
            <>
              {!profile.onboarded && (
                <div style={{ marginBottom: 12 }}>
                  <Onboarding profile={profile} onDone={(p) => { setProfile(p); refresh(); }} />
                </div>
              )}
              <Today
                profile={profile}
                day={day}
                isToday={isToday}
                actions={{
                  addFood: (meal) => setSheet({ kind: "food", meal, tab: "recent" }),
                  editEntry: (entry) => setSheet({ kind: "entry", entry }),
                  addWorkout: () => setSheet({ kind: "workout" }),
                  editWorkout: (workout) => setSheet({ kind: "workout", workout }),
                  editSteps: () => setSheet({ kind: "steps" }),
                  editWeight: () => setSheet({ kind: "weight" }),
                  editGoal: () => setSheet({ kind: "goal" }),
                  mealToRecipe: (meal) =>
                    setSheet({
                      kind: "recipe",
                      back: null,
                      draft: {
                        name: "",
                        servings: 1,
                        totalG: null,
                        items: day.entries
                          .filter((e) => e.meal === meal)
                          .map((e) => ({ foodId: e.foodId, name: e.name, brand: e.brand, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, image: e.image })),
                      },
                    }),
                  copyMeal: async (meal) => {
                    const r = await api<{ copied: number }>("/api/entries/copy", { method: "POST", body: { from: addDays(date, -1), to: date, meal } });
                    say(r.copied ? `${MEAL_LABEL[meal]} de ayer copiada` : `Ayer no hubo ${MEAL_LABEL[meal].toLowerCase()}`);
                    if (r.copied) refresh();
                  },
                }}
              />
            </>
          )}
        </>
      )}
      {tab === "progreso" && profile && <Progress profile={profile} streak={streak} version={version} />}
      {tab === "ajustes" && profile && (
        <Settings
          profile={profile}
          onProfile={(p) => {
            setProfile(p);
            setVersion((v) => v + 1);
          }}
          toast={say}
          devAuth={devAuth}
          accountSlot={devAuth ? <div className="hint">Modo local sin cuentas</div> : <Account />}
          onSync={() => sync(true)}
          syncing={syncing}
          focus={focus}
        />
      )}

      <nav className="nav" aria-label="Secciones">
        <div className="nav-in">
          <button className="nav-b" aria-current={tab === "hoy" ? "page" : undefined} onClick={() => setTab("hoy")}>
            <IHome size={22} />
            Hoy
          </button>
          <button className="nav-b" aria-current={tab === "progreso" ? "page" : undefined} onClick={() => setTab("progreso")}>
            <IChart size={22} />
            Progreso
          </button>
          <button className="fab" onClick={() => setSheet({ kind: "food", meal: defaultMeal(), tab: "scan" })} aria-label="Escanear alimento">
            <IScan size={26} />
          </button>
          <button className="nav-b" onClick={() => { setTab("hoy"); setSheet({ kind: "workout" }); }}>
            <IWorkout type="gimnasio" size={22} />
            Entreno
          </button>
          <button className="nav-b" aria-current={tab === "ajustes" ? "page" : undefined} onClick={() => { setFocus(null); setTab("ajustes"); }}>
            <ISettings size={22} />
            Ajustes
          </button>
        </div>
      </nav>

      {sheet?.kind === "food" && (
        <AddFood
          date={date}
          meal={sheet.meal}
          initialTab={sheet.tab}
          onClose={() => setSheet(null)}
          onRecipe={(r) => setSheet({ kind: "recipe", back: sheet.meal, draft: r ?? { name: "", servings: 1, totalG: null, items: [] } })}
          onAdded={(entry, quick) => {
            if (!quick) setSheet(null);
            say(`${entry.name.slice(0, 28)} añadido`, {
              label: "Deshacer",
              run: async () => {
                await api(`/api/entries/${entry.id}`, { method: "DELETE" });
                refresh();
              },
            });
            refresh();
          }}
        />
      )}
      {sheet?.kind === "entry" && (
        <FoodSheet
          edit
          food={entryAsFood(sheet.entry)}
          grams={sheet.entry.grams}
          meal={sheet.entry.meal}
          onClose={() => setSheet(null)}
          date={sheet.entry.date}
          onSubmit={async (grams, meal, extra) => {
            await api(`/api/entries/${sheet.entry.id}`, { method: "PATCH", body: { grams, meal, ...extra } });
            closeAndRefresh(extra?.date && extra.date !== sheet.entry.date ? "Movido a otro día" : undefined);
          }}
          onDelete={async () => {
            const e = sheet.entry;
            await api(`/api/entries/${e.id}`, { method: "DELETE" });
            setSheet(null);
            say("Eliminado", {
              label: "Deshacer",
              run: async () => {
                await api("/api/entries", { method: "POST", body: entryPayload(entryAsFood(e), e.grams, e.meal, e.date) });
                refresh();
              },
            });
            refresh();
          }}
        />
      )}
      {sheet?.kind === "goal" && profile && day && (
        <GoalSheet
          date={date}
          body={profile}
          auto={budget(profile, day.steps?.steps ?? 0, day.workouts).auto}
          current={day.goal}
          onClose={() => setSheet(null)}
          onSaved={closeAndRefresh}
        />
      )}
      {sheet?.kind === "recipe" && (
        <RecipeEditor
          draft={sheet.draft}
          onClose={() => setSheet(sheet.back ? { kind: "food", meal: sheet.back, tab: "recipes" } : null)}
          onSaved={(msg) => {
            say(msg);
            refresh();
            setSheet(sheet.back ? { kind: "food", meal: sheet.back, tab: "recipes" } : null);
          }}
        />
      )}
      {sheet?.kind === "workout" && profile && <WorkoutSheet date={date} body={profile} workout={sheet.workout} onClose={() => setSheet(null)} onSaved={closeAndRefresh} />}
      {sheet?.kind === "steps" && profile && day && (
        <StepsSheet
          date={date}
          body={profile}
          steps={day.steps?.steps ?? 0}
          workouts={day.workouts}
          onClose={() => setSheet(null)}
          onSaved={closeAndRefresh}
          onSetup={() => {
            setSheet(null);
            setFocus("apple");
            setTab("ajustes");
          }}
        />
      )}
      {sheet?.kind === "weight" && day && <WeightSheet date={date} current={day.weight} onClose={() => setSheet(null)} onSaved={closeAndRefresh} />}
      {toast && <Toast msg={toast.msg} action={toast.action} onDone={() => setToast(null)} />}
    </main>
  );
}

function entryAsFood(e: Entry): Food {
  return {
    id: e.foodId ?? `n:${e.name}`,
    name: e.name,
    brand: e.brand,
    kcal: e.kcal,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    image: e.image,
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
  };
}

function WeekStrip({ days, selected, today, profile, onPick }: { days: HistoryDay[]; selected: string; today: string; profile: Profile; onPick: (d: string) => void }) {
  return (
    <div className="week">
      {days.map((d) => {
        const future = d.date > today;
        const target = d.target || budget(profile, 0, []).target;
        const over = d.consumed > target * 1.05;
        return (
          <button key={d.date} className={`wd${future ? " future" : ""}`} aria-current={d.date === selected ? "date" : undefined} onClick={() => !future && onPick(d.date)} disabled={future} aria-label={d.date}>
            {weekdayLetter(d.date)}
            <Ring size={30} stroke={4} value={d.consumed} max={target} color={over ? "var(--over)" : "var(--accent)"} />
            <span className="n">{Number(d.date.slice(8))}</span>
          </button>
        );
      })}
    </div>
  );
}
