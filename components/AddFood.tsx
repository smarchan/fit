"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Entry, Food, Meal, Recipe } from "@/lib/types";
import { MEALS, MEAL_LABEL } from "@/lib/types";
import { nutrition } from "@/lib/energy";
import { recipeAsFood, recipePerServing } from "@/lib/recipes";
import { api, fmt } from "@/lib/client";
import { NumInput, parseNum, Sheet } from "./ui";
import { IBook, IClock, IEdit, IPlus, IScan, ISearch, ITrash } from "./icons";
import Scanner from "./Scanner";

export type AddTab = "scan" | "search" | "recent" | "recipes" | "create";
type Tab = AddTab;

/** Values of a logged entry that can be corrected (nutrition per 100 g). */
export interface EntryEdit {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}
interface Recent {
  food: Food;
  grams: number;
  count: number;
}

export function entryPayload(food: Food, grams: number, meal: Meal, date: string) {
  return { date, meal, grams, foodId: food.id.startsWith("n:") ? null : food.id, name: food.name, brand: food.brand, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, image: food.image };
}

const defaultGrams = (f: Food) => f.servingG ?? 100;

export default function AddFood({ date, meal: meal0, initialTab, onClose, onAdded, onRecipe, pick }: {
  date: string;
  meal: Meal;
  initialTab: Tab;
  onClose: () => void;
  onAdded: (e: Entry, undo: boolean) => void;
  /** Open the recipe editor: with a recipe to edit it, or null for a new one. */
  onRecipe: (r: Recipe | null) => void;
  /** Ingredient picker mode: returns the food and amount instead of logging it. */
  pick?: (food: Food, grams: number) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [meal, setMeal] = useState<Meal>(meal0);
  const [selected, setSelected] = useState<{ food: Food; grams: number } | null>(null);
  const [recent, setRecent] = useState<Recent[] | null>(null);
  const [custom, setCustom] = useState<Food[]>([]);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [editing, setEditing] = useState<Food | null>(null);
  const [lookup, setLookup] = useState<{ code: string; state: "loading" | "missing" | "error"; msg?: string } | null>(null);

  useEffect(() => {
    api<{ recent: Recent[]; custom: Food[] }>("/api/foods")
      .then((r) => {
        setRecent(r.recent);
        setCustom(r.custom);
      })
      .catch(() => setRecent([]));
    if (!pick)
      api<{ recipes: Recipe[] }>("/api/recipes")
        .then((r) => setRecipes(r.recipes))
        .catch(() => setRecipes([]));
  }, [pick]);

  const add = async (food: Food, grams: number, m = meal, quick = false) => {
    if (pick) {
      pick(food, grams);
      return;
    }
    const { entry } = await api<{ entry: Entry }>("/api/entries", { method: "POST", body: entryPayload(food, grams, m, date) });
    onAdded(entry, quick);
  };

  const onCode = useCallback(async (code: string) => {
    setLookup({ code, state: "loading" });
    try {
      const { food } = await api<{ food: Food }>(`/api/food/${code}`);
      setLookup(null);
      setSelected({ food, grams: defaultGrams(food) });
    } catch (e) {
      const status = (e as { status?: number }).status;
      setLookup({ code, state: status === 404 ? "missing" : "error", msg: (e as Error).message });
    }
  }, []);

  if (selected) {
    return (
      <FoodSheet
        food={selected.food}
        grams={selected.grams}
        meal={meal}
        onBack={() => setSelected(null)}
        onClose={onClose}
        cta={pick ? "Añadir al ingrediente" : undefined}
        onSubmit={async (g, m) => {
          await add(selected.food, g, m);
          setMeal(m);
        }}
      />
    );
  }

  if (editing) {
    return (
      <Sheet title="Editar alimento" onClose={() => setEditing(null)}>
        <CreateTab
          initial={editing}
          onDone={(f) => {
            setCustom((c) => c.map((x) => (x.id === f.id ? f : x)));
            setEditing(null);
          }}
        />
      </Sheet>
    );
  }

  const tabs = (
    <div className="tabs" role="tablist">
      {(
        [
          ["scan", "Escanear", <IScan size={16} key="i" />],
          ["search", "Buscar", <ISearch size={16} key="i" />],
          ["recent", "Recientes", <IClock size={16} key="i" />],
          ["recipes", "Recetas", <IBook size={16} key="i" />],
          ["create", "Crear", <IEdit size={16} key="i" />],
        ] as const
      )
        .filter(([k]) => !(pick && k === "recipes"))
        .map(([k, l, i]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
          {i}
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet title={pick ? "Añadir ingrediente" : MEAL_LABEL[meal]} onClose={onClose} tall head={tabs}>
      {!pick && (
        <div className="chips scroll" role="group" aria-label="Comida">
          {MEALS.map((m) => (
            <button key={m} className="chip" aria-pressed={meal === m} onClick={() => setMeal(m)}>
              {MEAL_LABEL[m]}
            </button>
          ))}
        </div>
      )}

      {tab === "scan" && (
        <>
          <Scanner onCode={onCode} paused={lookup?.state === "loading"} />
          {lookup?.state === "loading" && <div className="spin" />}
          {lookup && lookup.state !== "loading" && (
            <div className="empty">
              <b>{lookup.state === "missing" ? "Producto no encontrado" : "No se pudo consultar"}</b>
              {lookup.state === "missing" ? `El código ${lookup.code} no está en Open Food Facts.` : lookup.msg}
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
                {lookup.state === "error" && (
                  <button className="btn sm" onClick={() => onCode(lookup.code)}>
                    Reintentar
                  </button>
                )}
                <button className="btn sm" onClick={() => setTab("create")}>
                  Crear alimento
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {tab === "search" && <SearchTab onPick={(f) => setSelected({ food: f, grams: defaultGrams(f) })} onQuick={(f) => add(f, defaultGrams(f), meal, true)} />}
      {tab === "recent" && (
        <RecentTab
          recent={recent}
          custom={custom}
          onPick={(f, g) => setSelected({ food: f, grams: g })}
          onQuick={(f, g) => add(f, g, meal, true)}
          onEditCustom={setEditing}
          onDeleteCustom={async (id) => {
            await api(`/api/foods/${encodeURIComponent(id)}`, { method: "DELETE" });
            setCustom((c) => c.filter((x) => x.id !== id));
          }}
        />
      )}
      {tab === "recipes" && <RecipesTab recipes={recipes} onPick={(f) => setSelected({ food: f, grams: defaultGrams(f) })} onQuick={(f) => add(f, defaultGrams(f), meal, true)} onRecipe={onRecipe} />}
      {tab === "create" && (
        <CreateTab
          onDone={(f) => {
            setCustom((c) => [f, ...c]);
            setSelected({ food: f, grams: defaultGrams(f) });
          }}
        />
      )}
    </Sheet>
  );
}

function Thumb({ food }: { food: Pick<Food, "image" | "name"> }) {
  return <span className="thumb">{food.image ? <img src={food.image} alt="" loading="lazy" /> : food.name.charAt(0).toUpperCase()}</span>;
}

function ResultRow({ food, grams, onPick, onQuick, extra }: { food: Food; grams?: number; onPick: () => void; onQuick: () => void; extra?: React.ReactNode }) {
  const g = grams ?? defaultGrams(food);
  const kcal = (food.kcal * g) / 100;
  return (
    <li style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 6 }}>
      <button className="result" onClick={onPick}>
        <Thumb food={food} />
        <span style={{ minWidth: 0 }}>
          <span className="n">{food.name}</span>
          <span className="d">
            {[food.brand, `${fmt(g)} g`, `P ${fmt(food.protein * g / 100)} · H ${fmt(food.carbs * g / 100)} · G ${fmt(food.fat * g / 100)}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="k num">
          {fmt(kcal)}
          <small>kcal</small>
        </span>
      </button>
      <span style={{ display: "flex", gap: 4 }}>
        {extra}
        <button className="quick-add" onClick={onQuick} aria-label={`Añadir ${food.name}`}>
          <IPlus size={16} />
        </button>
      </span>
    </li>
  );
}

function SearchTab({ onPick, onQuick }: { onPick: (f: Food) => void; onQuick: (f: Food) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Food[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(() => {
      api<{ foods: Food[] }>(`/api/food/search?q=${encodeURIComponent(term)}`)
        .then((r) => id === seq.current && setRes(r.foods))
        .catch(() => id === seq.current && setRes([]))
        .finally(() => id === seq.current && setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <>
      <div className="search">
        <ISearch size={18} />
        <input className="input" autoFocus placeholder="Pollo, yogur griego, Hacendado…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
      </div>
      {loading && !res && <div className="spin" />}
      {res && res.length === 0 && !loading && (
        <div className="empty">
          <b>Sin resultados</b>Prueba con otra palabra o escanea el código.
        </div>
      )}
      {res && res.length > 0 && (
        <ul className="results" style={{ opacity: loading ? 0.6 : 1 }}>
          {res.map((f) => (
            <ResultRow key={f.id} food={f} onPick={() => onPick(f)} onQuick={() => onQuick(f)} />
          ))}
        </ul>
      )}
    </>
  );
}

function RecentTab({ recent, custom, onPick, onQuick, onEditCustom, onDeleteCustom }: { recent: Recent[] | null; custom: Food[]; onPick: (f: Food, g: number) => void; onQuick: (f: Food, g: number) => void; onEditCustom: (f: Food) => void; onDeleteCustom: (id: string) => void }) {
  if (!recent) return <div className="spin" />;
  if (!recent.length && !custom.length)
    return (
      <div className="empty">
        <b>Aún no hay recientes</b>Los alimentos que registres aparecerán aquí para añadirlos con un toque.
      </div>
    );
  return (
    <>
      {recent.length > 0 && (
        <ul className="results">
          {recent.map((r) => (
            <ResultRow key={r.food.id} food={r.food} grams={r.grams} onPick={() => onPick(r.food, r.grams)} onQuick={() => onQuick(r.food, r.grams)} />
          ))}
        </ul>
      )}
      {custom.length > 0 && (
        <>
          <div className="lbl">Mis alimentos</div>
          <ul className="results">
            {custom.map((f) => (
              <ResultRow
                key={f.id}
                food={f}
                onPick={() => onPick(f, defaultGrams(f))}
                onQuick={() => onQuick(f, defaultGrams(f))}
                extra={
                  <>
                    <button className="quick-add" onClick={() => onEditCustom(f)} aria-label={`Editar ${f.name}`} style={{ background: "transparent", color: "var(--faint)" }}>
                      <IEdit size={16} />
                    </button>
                    <button className="quick-add" onClick={() => onDeleteCustom(f.id)} aria-label={`Borrar ${f.name}`} style={{ background: "transparent", color: "var(--faint)" }}>
                      <ITrash size={16} />
                    </button>
                  </>
                }
              />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function RecipesTab({ recipes, onPick, onQuick, onRecipe }: { recipes: Recipe[] | null; onPick: (f: Food) => void; onQuick: (f: Food) => void; onRecipe: (r: Recipe | null) => void }) {
  if (!recipes) return <div className="spin" />;
  return (
    <>
      <button className="btn block" onClick={() => onRecipe(null)}>
        <IPlus size={16} />
        Nueva receta
      </button>
      {recipes.length === 0 ? (
        <div className="empty">
          <b>Aún no tienes recetas</b>Crea una con sus ingredientes, o guarda una comida ya registrada desde Hoy.
        </div>
      ) : (
        <ul className="results">
          {recipes.map((r) => {
            const food = recipeAsFood(r);
            const ps = recipePerServing(r);
            return (
              <li key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 6 }}>
                <button className="result" onClick={() => onPick(food)}>
                  <Thumb food={food} />
                  <span style={{ minWidth: 0 }}>
                    <span className="n">{r.name}</span>
                    <span className="d">
                      {[r.servings === 1 ? "1 ración" : `${fmt(r.servings, 2)} raciones`, `P ${fmt(ps.protein)} · H ${fmt(ps.carbs)} · G ${fmt(ps.fat)}`].join(" · ")}
                    </span>
                  </span>
                  <span className="k num">
                    {fmt(ps.kcal)}
                    <small>kcal/ración</small>
                  </span>
                </button>
                <span style={{ display: "flex", gap: 4 }}>
                  <button className="quick-add" onClick={() => onRecipe(r)} aria-label={`Editar ${r.name}`} style={{ background: "transparent", color: "var(--faint)" }}>
                    <IEdit size={16} />
                  </button>
                  <button className="quick-add" onClick={() => onQuick(food)} aria-label={`Añadir ${r.name}`}>
                    <IPlus size={16} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function CreateTab({ initial, onDone }: { initial?: Food; onDone: (f: Food) => void }) {
  const txt = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 100) / 100).replace(".", ","));
  const [v, setV] = useState({ name: initial?.name ?? "", brand: initial?.brand ?? "", kcal: txt(initial?.kcal), protein: txt(initial?.protein), carbs: txt(initial?.carbs), fat: txt(initial?.fat), servingG: txt(initial?.servingG) });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (x: string) => setV((s) => ({ ...s, [k]: x }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { food } = await api<{ food: Food }>("/api/foods", {
        method: "POST",
        body: { id: initial?.id, name: v.name, brand: v.brand, kcal: parseNum(v.kcal), protein: parseNum(v.protein) ?? 0, carbs: parseNum(v.carbs) ?? 0, fat: parseNum(v.fat) ?? 0, servingG: parseNum(v.servingG) },
      });
      onDone(food);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack" onSubmit={save}>
      <div className="field">
        <label htmlFor="cf-n">Nombre</label>
        <input id="cf-n" className="input" value={v.name} onChange={(e) => set("name")(e.target.value)} placeholder="Tortilla de mi madre" />
      </div>
      <div className="field">
        <label htmlFor="cf-b">Marca (opcional)</label>
        <input id="cf-b" className="input" value={v.brand} onChange={(e) => set("brand")(e.target.value)} />
      </div>
      <div className="lbl">Por cada 100 g</div>
      <div className="row">
        <div className="field">
          <label>Calorías</label>
          <NumInput value={v.kcal} onChange={set("kcal")} suffix="kcal" />
        </div>
        <div className="field">
          <label>Proteína</label>
          <NumInput value={v.protein} onChange={set("protein")} suffix="g" />
        </div>
        <div className="field">
          <label>Hidratos</label>
          <NumInput value={v.carbs} onChange={set("carbs")} suffix="g" />
        </div>
        <div className="field">
          <label>Grasa</label>
          <NumInput value={v.fat} onChange={set("fat")} suffix="g" />
        </div>
      </div>
      <div className="field">
        <label>Ración habitual (opcional)</label>
        <NumInput value={v.servingG} onChange={set("servingG")} suffix="g" />
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary block" disabled={busy || !v.name.trim() || parseNum(v.kcal) == null}>
        {initial ? "Guardar cambios" : "Guardar y añadir"}
      </button>
    </form>
  );
}

/* ---------------- Food detail (add or edit) ---------------- */

export function FoodSheet({
  food: food0,
  grams: g0,
  meal: m0,
  onSubmit,
  onClose,
  onBack,
  onDelete,
  edit,
  date: date0,
  cta,
}: {
  food: Food;
  grams: number;
  meal: Meal;
  /** `extra` is sent only when editing a logged entry: its name, nutrition per 100 g and date. */
  onSubmit: (grams: number, meal: Meal, extra?: EntryEdit) => Promise<void>;
  onClose: () => void;
  onBack?: () => void;
  onDelete?: () => Promise<void>;
  edit?: boolean;
  date?: string;
  /** Replaces the "Añadir · N kcal" label (ingredient picker). */
  cta?: string;
}) {
  const serving = food0.servingG;
  const [unit, setUnit] = useState<"g" | "s">(serving && !edit && g0 === serving ? "s" : "g");
  const [raw, setRaw] = useState(unit === "s" && serving ? "1" : String(Math.round(g0 * 10) / 10).replace(".", ","));
  const [meal, setMeal] = useState(m0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const txt = (x: number) => String(Math.round(x * 100) / 100).replace(".", ",");
  const [vals, setVals] = useState({ name: food0.name, kcal: txt(food0.kcal), protein: txt(food0.protein), carbs: txt(food0.carbs), fat: txt(food0.fat) });
  const [day, setDay] = useState(date0 ?? "");
  const setVal = (k: keyof typeof vals) => (x: string) => setVals((s) => ({ ...s, [k]: x }));
  // While editing, everything on screen follows the values typed in "Editar datos".
  const food: Food = useMemo(
    () => (edit ? { ...food0, name: vals.name.trim() || food0.name, kcal: parseNum(vals.kcal) ?? 0, protein: parseNum(vals.protein) ?? 0, carbs: parseNum(vals.carbs) ?? 0, fat: parseNum(vals.fat) ?? 0 } : food0),
    [edit, food0, vals],
  );
  const qty = parseNum(raw) ?? 0;
  const grams = unit === "s" && serving ? qty * serving : qty;
  const n = useMemo(() => nutrition(food, grams), [food, grams]);

  const switchUnit = (u: "g" | "s") => {
    if (u === unit || !serving) return;
    setRaw(u === "s" ? fmtQty(grams / serving) : String(Math.round(grams)));
    setUnit(u);
  };
  const bump = (d: number) => {
    const step = unit === "s" ? 0.5 : grams >= 100 ? 10 : 5;
    setRaw(fmtQty(Math.max(0, qty + d * step)));
  };
  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await onSubmit(
        Math.round(grams * 10) / 10,
        meal,
        edit ? { name: food.name, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, date: day || date0 || "" } : undefined,
      );
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const presets = unit === "s" ? [0.5, 1, 1.5, 2] : [50, 100, 150, 200, 250];
  const rows: [string, number | null, string, boolean?][] = [
    ["Energía", food.kcal, "kcal"],
    ["Grasas", food.fat, "g"],
    ["Saturadas", food.satFat, "g", true],
    ["Hidratos", food.carbs, "g"],
    ["Azúcares", food.sugars, "g", true],
    ["Fibra", food.fiber, "g"],
    ["Proteínas", food.protein, "g"],
    ["Sal", food.salt, "g"],
  ];

  return (
    <Sheet
      title={edit ? "Editar" : "Añadir"}
      onClose={onClose}
      tall
      footer={
        <>
          {onBack && (
            <button className="btn ghost" style={{ flex: "0 0 auto" }} onClick={onBack}>
              Atrás
            </button>
          )}
          {onDelete && (
            <button
              className="btn danger"
              style={{ flex: "0 0 auto" }}
              onClick={async () => {
                setBusy(true);
                await onDelete();
              }}
              disabled={busy}
              aria-label="Eliminar"
            >
              <ITrash size={18} />
            </button>
          )}
          <button className="btn primary" onClick={submit} disabled={busy || grams <= 0}>
            {edit ? "Guardar" : cta ?? `Añadir · ${fmt(n.kcal)} kcal`}
          </button>
        </>
      }
    >
      <div className="fd-head">
        <span className={`thumb${food.image ? "" : " empty-thumb"}`}>{food.image ? <img src={food.image.replace(".200.", ".400.")} alt="" /> : food.name.charAt(0)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="fd-name">{food.name}</div>
          <div className="fd-brand">{[food.brand, food.quantity].filter(Boolean).join(" · ") || (food.id.startsWith("g:") ? "Genérico" : food.id.startsWith("c:") ? "Mi alimento" : "")}</div>
          {(food.nutriscore || food.nova) && (
            <div className="badges">
              {food.nutriscore && (
                <span className="ns" aria-label={`Nutri-Score ${food.nutriscore.toUpperCase()}`}>
                  {["a", "b", "c", "d", "e"].map((l) => (
                    <span key={l} className={l === food.nutriscore ? `on ns-${l}` : undefined}>
                      {l.toUpperCase()}
                    </span>
                  ))}
                </span>
              )}
              {food.nova && <span className="badge">NOVA {food.nova}</span>}
            </div>
          )}
        </div>
      </div>

      <div className="fd-macros">
        <div className="fdm">
          <div className="v num" style={{ color: "var(--accent)" }}>{fmt(n.kcal)}</div>
          <div className="k">kcal</div>
        </div>
        {(
          [
            ["Proteína", n.protein, "var(--protein)"],
            ["Hidratos", n.carbs, "var(--carbs)"],
            ["Grasa", n.fat, "var(--fat)"],
          ] as const
        ).map(([k, v, c]) => (
          <div className="fdm" key={k}>
            <div className="v num">{fmt(v, 1)}</div>
            <div className="k">
              <i style={{ background: c }} />
              {k}
            </div>
          </div>
        ))}
      </div>

      <div className="field">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="lbl" style={{ flex: 1 }}>Cantidad</span>
          {serving && (
            <div className="seg" style={{ width: 200 }}>
              <button aria-pressed={unit === "g"} onClick={() => switchUnit("g")}>Gramos</button>
              <button aria-pressed={unit === "s"} onClick={() => switchUnit("s")}>Ración</button>
            </div>
          )}
        </div>
        <div className="amount">
          <NumInput value={raw} onChange={setRaw} suffix={unit === "s" ? `× ${fmt(serving!)} g` : "g"} />
          <div className="stepper">
            <button onClick={() => bump(-1)} aria-label="Menos">−</button>
            <button onClick={() => bump(1)} aria-label="Más">+</button>
          </div>
        </div>
        <div className="chips">
          {presets.map((p) => (
            <button key={p} className="chip" aria-pressed={qty === p} onClick={() => setRaw(fmtQty(p))}>
              {unit === "s" ? `${fmtQty(p)} ${p === 1 ? "ración" : "raciones"}` : `${p} g`}
            </button>
          ))}
        </div>
        {food.servingLabel && <div className="hint">Ración del envase: {food.servingLabel}</div>}
      </div>

      {!cta && (
        <div className="field">
          <span className="lbl">Comida</span>
          <div className="chips scroll">
            {MEALS.map((m) => (
              <button key={m} className="chip" aria-pressed={meal === m} onClick={() => setMeal(m)}>
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {edit && (
        <details className="more">
          <summary>Editar datos ›</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="field">
              <label htmlFor="ed-n">Nombre</label>
              <input id="ed-n" className="input" value={vals.name} onChange={(e) => setVal("name")(e.target.value)} />
            </div>
            <div className="lbl">Por cada 100 g</div>
            <div className="row">
              <div className="field">
                <label>Calorías</label>
                <NumInput value={vals.kcal} onChange={setVal("kcal")} suffix="kcal" />
              </div>
              <div className="field">
                <label>Proteína</label>
                <NumInput value={vals.protein} onChange={setVal("protein")} suffix="g" />
              </div>
              <div className="field">
                <label>Hidratos</label>
                <NumInput value={vals.carbs} onChange={setVal("carbs")} suffix="g" />
              </div>
              <div className="field">
                <label>Grasa</label>
                <NumInput value={vals.fat} onChange={setVal("fat")} suffix="g" />
              </div>
            </div>
            {date0 && (
              <div className="field">
                <label htmlFor="ed-d">Día</label>
                <input id="ed-d" className="input" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            )}
          </div>
        </details>
      )}

      <table className="ntable">
        <thead>
          <tr>
            <th>Información nutricional</th>
            <th>100 g</th>
            <th>{fmt(grams)} g</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .filter(([, v]) => v != null)
            .map(([k, v, u, sub]) => (
              <tr key={k}>
                <td className={sub ? "sub" : undefined}>{k}</td>
                <td className="num">
                  {fmt(v!, u === "kcal" ? 0 : 1)} {u}
                </td>
                <td className="num">
                  {fmt((v! * grams) / 100, u === "kcal" ? 0 : 1)} {u}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {food.allergens.length > 0 && (
        <div className="field">
          <span className="lbl">Alérgenos</span>
          <div className="allergens">
            {food.allergens.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </div>
        </div>
      )}
      {food.ingredients && (
        <details className="more">
          <summary>Ingredientes ›</summary>
          <p>{food.ingredients}</p>
        </details>
      )}
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}

function fmtQty(x: number) {
  return String(Math.round(x * 100) / 100).replace(".", ",");
}
