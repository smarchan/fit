"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/types";
import { bmr, suggestedBase, macroTargets, baseOf } from "@/lib/energy";
import { api, fmt } from "@/lib/client";
import { NumInput, parseNum } from "./ui";
import { ICopy, IRefresh } from "./icons";

type Patch = Partial<Profile>;

export default function Settings({ profile, onProfile, toast, devAuth, accountSlot, onSync, syncing, focus }: {
  profile: Profile;
  onProfile: (p: Profile) => void;
  toast: (m: string) => void;
  devAuth: boolean;
  accountSlot: React.ReactNode;
  onSync: () => void;
  syncing: boolean;
  focus?: string | null;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const pending = useRef<Patch>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft({ ...profile, ...pending.current }), [profile]);

  const change = (patch: Patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const body = pending.current;
      pending.current = {};
      try {
        const { profile: p } = await api<{ profile: Profile }>("/api/profile", { method: "PUT", body });
        onProfile(p);
      } catch (e) {
        toast((e as Error).message);
      }
    }, 600);
  };

  const sugg = suggestedBase(draft);
  const base = baseOf(draft);
  const m = macroTargets({ ...draft, proteinG: null, carbsG: null, fatG: null }, base + draft.goalDelta);
  // Hidratos blank = what is left after the protein and fat actually in use.
  const carbsAuto = macroTargets({ ...draft, carbsG: null }, base + draft.goalDelta).carbs;
  const goalMode = draft.goalDelta < 0 ? "lose" : draft.goalDelta > 0 ? "gain" : "keep";

  return (
    <div className="cols">
      <div className="stack">
        <div className="card set-section">
          <span className="card-t">Tu cuerpo</span>
          <div className="seg">
            <button aria-pressed={draft.sex === "m"} onClick={() => change({ sex: "m" })}>Hombre</button>
            <button aria-pressed={draft.sex === "f"} onClick={() => change({ sex: "f" })}>Mujer</button>
          </div>
          <div className="row-3">
            <Field label="Nacimiento" value={draft.birthYear} onCommit={(v) => change({ birthYear: v })} inputMode="numeric" />
            <Field label="Altura" value={draft.heightCm} suffix="cm" onCommit={(v) => change({ heightCm: v })} inputMode="numeric" />
            <Field label="Peso" value={draft.weightKg} suffix="kg" onCommit={(v) => change({ weightKg: v })} />
          </div>
        </div>

        <div className="card set-section">
          <span className="card-t">Calorías base</span>
          <div>
            <div className="big-val num">{fmt(base)} <span className="muted" style={{ fontSize: 15, fontWeight: 600 }}>kcal/día</span></div>
            <div className="hint">
              {draft.baseKcal == null
                ? sugg
                  ? `Metabolismo basal ${fmt(bmr(draft)!)} × 1,2 (día sedentario). Tus pasos y entrenos se suman encima.`
                  : "Completa tus datos para calcularla."
                : "Cifra propia. Pon tu gasto en un día sin entrenar y con pocos pasos, no tu mantenimiento con actividad."}
            </div>
          </div>
          <div className="seg">
            <button aria-pressed={draft.baseKcal == null} onClick={() => change({ baseKcal: null })}>Calcular</button>
            <button aria-pressed={draft.baseKcal != null} onClick={() => change({ baseKcal: draft.baseKcal ?? sugg ?? 2000 })}>Mi cifra</button>
          </div>
          {draft.baseKcal != null && <Field label="Calorías base" value={draft.baseKcal} suffix="kcal" onCommit={(v) => change({ baseKcal: v ?? null })} inputMode="numeric" />}
        </div>

        <div className="card set-section">
          <span className="card-t">Objetivo</span>
          <div className="seg">
            <button aria-pressed={goalMode === "lose"} onClick={() => change({ goalDelta: goalMode === "lose" ? draft.goalDelta : -400 })}>Perder</button>
            <button aria-pressed={goalMode === "keep"} onClick={() => change({ goalDelta: 0 })}>Mantener</button>
            <button aria-pressed={goalMode === "gain"} onClick={() => change({ goalDelta: goalMode === "gain" ? draft.goalDelta : 250 })}>Ganar</button>
          </div>
          {goalMode !== "keep" && (
            <Slider
              label={goalMode === "lose" ? "Déficit diario" : "Superávit diario"}
              value={Math.abs(draft.goalDelta)}
              min={goalMode === "lose" ? 100 : 100}
              max={goalMode === "lose" ? 1000 : 750}
              step={50}
              display={(v) => `${fmt(v)} kcal · ≈ ${fmt((v * 7) / 7700, 1)} kg/sem`}
              onChange={(v) => change({ goalDelta: goalMode === "lose" ? -v : v })}
            />
          )}
          <Slider
            label="Calorías de entrenos que se suman"
            value={Math.round(draft.eatBack * 100)}
            min={0}
            max={100}
            step={5}
            display={(v) => `${v} %`}
            onChange={(v) => change({ eatBack: v / 100 })}
            hint="Las estimaciones de gasto suelen pasarse. Entre 50 y 75 % es lo más prudente."
          />
        </div>

        <div className="card set-section">
          <span className="card-t">Macros</span>
          <Slider label="Proteína" value={draft.proteinPerKg} min={1.2} max={3} step={0.1} display={(v) => `${fmt(v, 1)} g/kg · ${fmt(m.protein)} g`} onChange={(v) => change({ proteinPerKg: Math.round(v * 10) / 10 })} />
          <Slider label="Grasa" value={Math.round(draft.fatPct * 100)} min={15} max={45} step={1} display={(v) => `${v} % · ${fmt(m.fat)} g`} onChange={(v) => change({ fatPct: v / 100 })} />
          <div className="hint">Hidratos: el resto, {fmt(m.carbs)} g en un día sin actividad extra.</div>
          <div className="lbl">O fija tus gramos</div>
          <div className="row-3">
            <Field label="Proteína" value={draft.proteinG} suffix="g" placeholder={String(m.protein)} onCommit={(v) => change({ proteinG: v })} inputMode="numeric" />
            <Field label="Hidratos" value={draft.carbsG} suffix="g" placeholder={String(carbsAuto)} onCommit={(v) => change({ carbsG: v })} inputMode="numeric" />
            <Field label="Grasa" value={draft.fatG} suffix="g" placeholder={String(m.fat)} onCommit={(v) => change({ fatG: v })} inputMode="numeric" />
          </div>
          <div className="hint">Lo que dejes en blanco se calcula con los ajustes de arriba. Cada día puedes cambiarlo tocando el objetivo en Hoy.</div>
        </div>
      </div>

      <div className="stack">
        <Integrations profile={profile} onProfile={onProfile} toast={toast} onSync={onSync} syncing={syncing} focus={focus} />
        <div className="card set-section">
          <span className="card-t">Cuenta</span>
          {accountSlot}
          <div className="set-row">
            <Link href="/privacidad" className="muted" style={{ fontSize: 14 }}>Privacidad</Link>
            <span className="spacer" />
            <DeleteAccount devAuth={devAuth} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, suffix, placeholder, onCommit, inputMode }: { label: string; value: number | null; suffix?: string; placeholder?: string; onCommit: (v: number | null) => void; inputMode?: "decimal" | "numeric" }) {
  const [raw, setRaw] = useState(value == null ? "" : String(value).replace(".", ","));
  useEffect(() => setRaw(value == null ? "" : String(value).replace(".", ",")), [value]);
  return (
    <div className="field" onBlur={() => parseNum(raw) !== value && onCommit(parseNum(raw))}>
      <label>{label}</label>
      <NumInput value={raw} onChange={setRaw} suffix={suffix} placeholder={placeholder} inputMode={inputMode} />
    </div>
  );
}

function Slider({ label, value, min, max, step, display, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; display: (v: number) => string; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="field">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <label>{label}</label>
        <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{display(value)}</span>
      </div>
      <input className="range" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function DeleteAccount({ devAuth }: { devAuth: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!confirm)
    return (
      <button className="btn sm danger" onClick={() => setConfirm(true)}>
        Eliminar cuenta
      </button>
    );
  return (
    <span style={{ display: "flex", gap: 6 }}>
      <button className="btn sm ghost" onClick={() => setConfirm(false)}>Cancelar</button>
      <button
        className="btn sm danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await api("/api/profile", { method: "DELETE" });
          window.location.href = devAuth ? "/" : "/sign-in";
        }}
      >
        Borrar todo
      </button>
    </span>
  );
}

/* ---------------- Integrations ---------------- */

function Integrations({ profile, onProfile, toast, onSync, syncing, focus }: { profile: Profile; onProfile: (p: Profile) => void; toast: (m: string) => void; onSync: () => void; syncing: boolean; focus?: string | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [showApple, setShowApple] = useState(focus === "apple");
  const [hevyKey, setHevyKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ k: string; m: string } | null>(null);
  const appleRef = useRef<HTMLDivElement>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/ingest/steps` : "/api/ingest/steps";

  useEffect(() => {
    if (focus === "apple") {
      setShowApple(true);
      setTimeout(() => appleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [focus]);

  const refresh = async () => onProfile((await api<{ profile: Profile }>("/api/profile")).profile);
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr({ k, m: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };
  const copy = (s: string) => navigator.clipboard?.writeText(s).then(() => toast("Copiado"));

  return (
    <div className="card set-section">
      <div style={{ display: "flex", alignItems: "center" }}>
        <span className="card-t" style={{ flex: 1 }}>Conexiones</span>
        {(profile.hevy || profile.strava) && (
          <button className="btn sm ghost" onClick={onSync} disabled={syncing}>
            <IRefresh size={15} /> {syncing ? "Sincronizando…" : "Sincronizar"}
          </button>
        )}
      </div>

      {/* Apple Health via Shortcut */}
      <div ref={appleRef} className="set-section" style={{ gap: 10 }}>
        <div className="set-row">
          <span className="int-ico" style={{ background: "#ffe4ea", color: "#ff2d55" }}>♥</span>
          <div className="grow">
            <div className="t">Apple Salud · pasos</div>
            <div className="s">Con un Atajo de iOS que envía tus pasos</div>
          </div>
          {profile.stepToken ? <span className="ok-pill">Activo</span> : null}
        </div>
        {!showApple ? (
          <button className="btn sm" onClick={() => setShowApple(true)}>{profile.stepToken ? "Ver instrucciones" : "Configurar"}</button>
        ) : (
          <>
            {token ? (
              <div className="field">
                <span className="lbl">Tu token (sólo se muestra ahora)</span>
                <div className="token">{token}</div>
                <button className="btn sm" onClick={() => copy(`Bearer ${token}`)}>
                  <ICopy size={15} /> Copiar «Bearer token»
                </button>
              </div>
            ) : (
              <button
                className="btn sm primary"
                disabled={busy === "token"}
                onClick={() =>
                  run("token", async () => {
                    const r = await api<{ token: string }>("/api/profile/token", { method: "POST" });
                    setToken(r.token);
                    await refresh();
                  })
                }
              >
                {profile.stepToken ? "Generar token nuevo (anula el anterior)" : "Generar token"}
              </button>
            )}
            <ol className="steps">
              <li>En el iPhone abre <b>Atajos</b> y crea uno nuevo.</li>
              <li>Añade <b>Buscar muestras de salud</b>: tipo <b>Pasos</b>, fecha de inicio <b>es hoy</b>.</li>
              <li>Añade <b>Calcular estadísticas</b> → <b>Suma</b> de las muestras.</li>
              <li>
                Añade <b>Obtener contenido de URL</b>: <code>{url}</code>{" "}
                <button className="btn sm ghost" style={{ height: 24, padding: "0 6px" }} onClick={() => copy(url)} aria-label="Copiar URL">
                  <ICopy size={13} />
                </button>
                <br />Método <b>POST</b>. Encabezado <code>Authorization</code> = <code>Bearer TU_TOKEN</code>. Cuerpo <b>JSON</b> con el campo <code>steps</code> = la suma.
              </li>
              <li>En <b>Automatización</b> crea varias de tipo <b>Hora del día</b> (p. ej. cada 2 h) con <b>Ejecutar inmediatamente</b>, y pon el atajo en un widget para lanzarlo cuando quieras.</li>
            </ol>
            <div className="hint">Con el iPhone bloqueado, iOS a veces no deja leer Salud: los pasos se ponen al día en la siguiente ejecución.</div>
          </>
        )}
        {err?.k === "token" && <div className="err">{err.m}</div>}
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: 0, width: "100%" }} />

      {/* Hevy */}
      <div className="set-section" style={{ gap: 10 }}>
        <div className="set-row">
          <span className="int-ico" style={{ background: "#e7eeff", color: "#2546b8" }}>H</span>
          <div className="grow">
            <div className="t">Hevy</div>
            <div className="s">Importa tus entrenos de gimnasio (necesita Hevy Pro)</div>
          </div>
          {profile.hevy && <span className="ok-pill">Vinculado</span>}
        </div>
        {profile.hevy ? (
          <button className="btn sm" disabled={busy === "hevy"} onClick={() => run("hevy", async () => {
            await api("/api/hevy", { method: "DELETE" });
            await refresh();
            toast("Hevy desvinculado");
          })}>Desvincular</button>
        ) : (
          <>
            <div className="amount">
              <input className="input mono" style={{ fontSize: 13 }} placeholder="Clave de API de Hevy" value={hevyKey} onChange={(e) => setHevyKey(e.target.value.trim())} />
              <button className="btn primary" disabled={!hevyKey || busy === "hevy"} onClick={() => run("hevy", async () => {
                const r = await api<{ sync: { hevy: number } }>("/api/hevy", { method: "PUT", body: { key: hevyKey } });
                setHevyKey("");
                await refresh();
                toast(`Hevy vinculado · ${r.sync.hevy} entrenos`);
              })}>{busy === "hevy" ? "…" : "Vincular"}</button>
            </div>
            <div className="hint">La clave está en hevy.com → Settings → Developer.</div>
          </>
        )}
        {err?.k === "hevy" && <div className="err">{err.m}</div>}
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: 0, width: "100%" }} />

      {/* Strava */}
      <div className="set-section" style={{ gap: 10 }}>
        <div className="set-row">
          <span className="int-ico" style={{ background: "#fc4c02", color: "#fff" }}>S</span>
          <div className="grow">
            <div className="t">Strava</div>
            <div className="s">{profile.strava ? profile.strava.name : "Bici, carrera y natación con las calorías del reloj"}</div>
          </div>
          {profile.strava && <span className="ok-pill">Vinculado</span>}
        </div>
        {profile.strava ? (
          <button className="btn sm" disabled={busy === "strava"} onClick={() => run("strava", async () => {
            await api("/api/strava/disconnect", { method: "POST" });
            await refresh();
            toast("Strava desvinculado");
          })}>Desvincular</button>
        ) : (
          <a className="btn sm" style={{ textDecoration: "none", background: "#fc4c02", borderColor: "#fc4c02", color: "#fff" }} href="/api/strava/connect">
            Conectar con Strava
          </a>
        )}
        {err?.k === "strava" && <div className="err">{err.m}</div>}
      </div>
    </div>
  );
}
