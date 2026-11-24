"use client";

import { useMemo, useState } from "react";
import type { Food, RecipeDraft, RecipeItem } from "@/lib/types";
import { api, fmt } from "@/lib/client";
import { recipePerServing, recipeSum, recipeWeight } from "@/lib/recipes";
import { NumInput, parseNum, Sheet } from "./ui";
import { IPlus, ITrash, IX } from "./icons";
import AddFood from "./AddFood";

const txt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** Create or edit a recipe: name, servings, ingredients and their amounts. Totals update as you type. */
export function RecipeEditor({ draft, onClose, onSaved }: { draft: RecipeDraft; onClose: () => void; onSaved: (msg: string) => void }) {
  const [name, setName] = useState(draft.name);
  const [servings, setServings] = useState(txt(draft.servings));
  const [totalG, setTotalG] = useState(draft.totalG ? txt(draft.totalG) : "");
  const [items, setItems] = useState<RecipeItem[]>(draft.items);
  const [grams, setGrams] = useState<string[]>(draft.items.map((i) => txt(i.grams)));
  const [picking, setPicking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Items with the amounts currently typed.
  const live = useMemo(() => items.map((i, k) => ({ ...i, grams: parseNum(grams[k] ?? "") ?? 0 })), [items, grams]);
  const sv = Math.max(0.25, parseNum(servings) ?? 1);
  const tg = parseNum(totalG);
  const sum = recipeSum(live);
  const per = recipePerServing({ items: live, servings: sv });
  const weight = recipeWeight({ items: live, totalG: tg });

  const addItem = (food: Food, g: number) => {
    setItems((x) => [...x, { foodId: food.id.startsWith("n:") ? null : food.id, name: food.name, brand: food.brand, grams: g, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat, image: food.image }]);
    setGrams((x) => [...x, txt(g)]);
    setPicking(false);
  };
  const removeItem = (k: number) => {
    setItems((x) => x.filter((_, i) => i !== k));
    setGrams((x) => x.filter((_, i) => i !== k));
  };

  const ok = name.trim() !== "" && live.length > 0 && live.every((i) => i.grams > 0);
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const body = { name, servings: sv, totalG: tg, items: live };
      if (draft.id) await api(`/api/recipes/${draft.id}`, { method: "PUT", body });
      else await api("/api/recipes", { method: "POST", body });
      onSaved(draft.id ? "Receta actualizada" : "Receta guardada");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    try {
      await api(`/api/recipes/${draft.id}`, { method: "DELETE" });
      onSaved("Receta eliminada");
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  // The ingredient picker takes the place of the editor; the editor keeps its state meanwhile.
  if (picking) {
    return <AddFood date="" meal="comida" initialTab="search" onClose={() => setPicking(false)} onAdded={() => {}} onRecipe={() => {}} pick={addItem} />;
  }

  return (
    <Sheet
      title={draft.id ? "Editar receta" : "Nueva receta"}
      onClose={onClose}
      tall
      footer={
        <>
          {draft.id && (
            <button className="btn danger" style={{ flex: "0 0 auto" }} onClick={remove} disabled={busy} aria-label="Eliminar receta">
              <ITrash size={18} />
              {confirm && "¿Seguro?"}
            </button>
          )}
          <button className="btn primary" onClick={save} disabled={busy || !ok}>
            Guardar
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="r-n">Nombre</label>
        <input id="r-n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pasta con pollo" autoFocus={!draft.name} />
      </div>

      <div className="sumbar">
        <div className="fdm">
          <div className="v num" style={{ color: "var(--accent)" }}>{fmt(per.kcal)}</div>
          <div className="k">kcal / ración</div>
        </div>
        {(
          [
            ["Proteína", per.protein, "var(--protein)"],
            ["Hidratos", per.carbs, "var(--carbs)"],
            ["Grasa", per.fat, "var(--fat)"],
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

      <div className="row">
        <div className="field">
          <label>Raciones</label>
          <NumInput value={servings} onChange={setServings} suffix="raciones" />
        </div>
        <div className="field">
          <label>Peso final (opcional)</label>
          <NumInput value={totalG} onChange={setTotalG} suffix="g" placeholder={String(Math.round(sum.grams))} />
        </div>
      </div>
      <div className="hint">
        Total: {fmt(sum.kcal)} kcal en {fmt(weight)} g. Si pesas el plato ya cocinado, escribe ese peso: así los gramos que tomes de verdad cuentan bien.
      </div>

      <div className="lbl">Ingredientes</div>
      <div>
        {items.map((i, k) => (
          <div className="ing" key={k}>
            <div style={{ minWidth: 0 }}>
              <div className="n">{i.name}</div>
              <div className="d num">{fmt((i.kcal * (parseNum(grams[k] ?? "") ?? 0)) / 100)} kcal</div>
            </div>
            <NumInput value={grams[k] ?? ""} onChange={(v) => setGrams((x) => x.map((y, j) => (j === k ? v : y)))} suffix="g" />
            <button className="ing-x" onClick={() => removeItem(k)} aria-label={`Quitar ${i.name}`}>
              <IX size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn block" onClick={() => setPicking(true)}>
        <IPlus size={16} />
        Añadir ingrediente
      </button>
      {err && <div className="err">{err}</div>}
    </Sheet>
  );
}
