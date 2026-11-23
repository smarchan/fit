"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryDay, Profile } from "@/lib/types";
import { addDays, shortDate, todayLocal } from "@/lib/dates";
import { macroTargets } from "@/lib/energy";
import { api, fmt, signed } from "@/lib/client";

const RANGES = [
  [7, "7 días"],
  [30, "30 días"],
  [90, "90 días"],
] as const;

export default function Progress({ profile, streak, version }: { profile: Profile; streak: number; version: number }) {
  const [range, setRange] = useState<number>(7);
  const [data, setData] = useState<{ days: HistoryDay[]; weights: { date: string; kg: number }[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const to = todayLocal();
    const from = addDays(to, -(range - 1));
    setErr("");
    api<{ days: HistoryDay[]; weights: { date: string; kg: number }[] }>(`/api/history?from=${from}&to=${to}`)
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, [range, version]);

  const stats = useMemo(() => {
    if (!data) return null;
    // Today is still in progress: leave it out of the averages once there are finished days.
    const all = data.days.filter((d) => d.logged);
    const closed = all.filter((d) => d.date < todayLocal());
    const logged = closed.length ? closed : all;
    const n = logged.length || 1;
    const avg = (f: (d: HistoryDay) => number, list = logged) => list.reduce((s, d) => s + f(d), 0) / (list.length || 1);
    const balance = logged.reduce((s, d) => s + d.consumed - d.target, 0);
    const onTarget = logged.filter((d) => Math.abs(d.consumed - d.target) <= d.target * 0.1).length;
    return {
      logged: logged.length,
      avgKcal: avg((d) => d.consumed),
      avgTarget: avg((d) => d.target),
      balance,
      // Against maintenance (target without the goal adjustment): estimated change in body weight.
      kg: logged.reduce((s, d) => s + d.consumed - (d.target - profile.goalDelta), 0) / 7700,
      onTarget,
      avgSteps: avg((d) => d.steps, data.days),
      workoutMin: data.days.reduce((s, d) => s + d.workoutMin, 0),
      workoutDays: data.days.filter((d) => d.workoutMin > 0).length,
      burned: data.days.reduce((s, d) => s + d.workoutKcal, 0),
      p: avg((d) => d.protein),
      c: avg((d) => d.carbs),
      f: avg((d) => d.fat),
      n,
    };
  }, [data, profile.goalDelta]);

  const chartDays = useMemo(() => (data?.days ?? []).map((d) => ({ ...d, label: shortDate(d.date) })), [data]);
  const macroT = stats ? macroTargets(profile, Math.round(stats.avgTarget)) : null;

  return (
    <div className="stack">
      <div className="seg">
        {RANGES.map(([v, l]) => (
          <button key={v} aria-pressed={range === v} onClick={() => setRange(v)}>
            {l}
          </button>
        ))}
      </div>
      {err && <div className="err">{err}</div>}
      {!data || !stats ? (
        <div className="skeleton" style={{ height: 420 }} />
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <div className="k">Balance vs objetivo</div>
              <div className={`v num ${Math.abs(stats.balance / stats.n) <= 150 ? "pos" : ""}`}>{signed(stats.balance)}</div>
              <div className="s">kcal · peso ≈ {signed(stats.kg, 1)} kg</div>
            </div>
            <div className="kpi">
              <div className="k">Racha</div>
              <div className="v num">{streak} {streak === 1 ? "día" : "días"}</div>
              <div className="s">
                {stats.onTarget}/{stats.logged} días en objetivo
              </div>
            </div>
            <div className="kpi">
              <div className="k">Media diaria</div>
              <div className="v num">{fmt(stats.avgKcal)}</div>
              <div className="s">de {fmt(stats.avgTarget)} kcal objetivo</div>
            </div>
            <div className="kpi">
              <div className="k">Entrenos</div>
              <div className="v num" style={{ color: stats.burned ? "var(--burn)" : undefined }}>{fmt(stats.burned)}</div>
              <div className="s">
                kcal · {stats.workoutDays} días · {fmt(stats.workoutMin / 60, 1)} h
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <span className="card-t">Calorías</span>
              <span className="spacer" />
              <span className="legend">
                <span><i style={{ background: "var(--accent)" }} />Comido</span>
                <span><i className="line" style={{ background: "var(--text)" }} />Objetivo</span>
              </span>
            </div>
            <div className="chart">
              <ResponsiveContainer>
                <ComposedChart data={chartDays} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => fmt(v)} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,.06)" }} content={<KcalTip />} />
                  <Bar dataKey="consumed" radius={[6, 6, 2, 2]} maxBarSize={28}>
                    {chartDays.map((d) => (
                      <Cell key={d.date} fill={!d.logged ? "#e8edf6" : d.consumed > d.target * 1.05 ? "var(--over)" : "var(--accent)"} />
                    ))}
                  </Bar>
                  <Line dataKey="target" stroke="#0e1525" strokeWidth={2} dot={false} type="linear" strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="cols">
            <div className="card">
              <div className="card-h">
                <span className="card-t">Pasos</span>
                <span className="spacer" />
                <span className="muted num" style={{ fontSize: 13 }}>media {fmt(stats.avgSteps)}</span>
              </div>
              <div className="chart sm">
                <ResponsiveContainer>
                  <BarChart data={chartDays} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <ReferenceLine y={10000} stroke="#c9d1e0" strokeDasharray="3 3" />
                    <Tooltip cursor={{ fill: "rgba(16,185,129,.06)" }} content={<SimpleTip unit="pasos" k="steps" />} />
                    <Bar dataKey="steps" fill="#10b981" radius={[6, 6, 2, 2]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card" style={{ marginTop: 0 }}>
              <div className="card-h">
                <span className="card-t">Peso</span>
                <span className="spacer" />
                {data.weights.length > 1 && (
                  <span className="muted num" style={{ fontSize: 13 }}>
                    {signed(data.weights[data.weights.length - 1].kg - data.weights[0].kg, 1)} kg
                  </span>
                )}
              </div>
              {data.weights.length < 2 ? (
                <div className="meal-empty">Registra tu peso al menos dos días para ver la tendencia.</div>
              ) : (
                <div className="chart sm">
                  <ResponsiveContainer>
                    <LineChart data={data.weights.map((w) => ({ ...w, label: shortDate(w.date) }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <XAxis dataKey="label" tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "#98a1b3", fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => fmt(v, 0)} />
                      <Tooltip content={<SimpleTip unit="kg" k="kg" decimals={1} />} />
                      <Line dataKey="kg" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }} type="monotone" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {macroT && stats.logged > 0 && (
            <div className="card">
              <div className="card-h">
                <span className="card-t">Macros medios</span>
              </div>
              <div className="macros">
                {(
                  [
                    ["Proteína", stats.p, macroT.protein, "var(--protein)"],
                    ["Hidratos", stats.c, macroT.carbs, "var(--carbs)"],
                    ["Grasa", stats.f, macroT.fat, "var(--fat)"],
                  ] as const
                ).map(([name, v, max, color]) => (
                  <div className="macro-row" key={name}>
                    <span className="name">{name}</span>
                    <span className="val num">
                      <b>{fmt(v)}</b> / {fmt(max)} g
                    </span>
                    <span className="bar">
                      <span style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type TipProps = { active?: boolean; payload?: { payload: Record<string, number | string | boolean> }[] };

function KcalTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as unknown as HistoryDay & { label: string };
  return (
    <div className="tt">
      <div className="muted" style={{ marginBottom: 4 }}>{d.label}</div>
      <div className="tt-row"><span>Comido</span><b className="num">{fmt(d.consumed)}</b></div>
      <div className="tt-row"><span>Objetivo</span><b className="num">{fmt(d.target)}</b></div>
      {d.logged && (
        <div className="tt-row">
          <span>Balance</span>
          <b className={`num ${d.consumed <= d.target ? "pos" : "neg"}`}>{signed(d.consumed - d.target)}</b>
        </div>
      )}
    </div>
  );
}

function SimpleTip({ active, payload, unit, k, decimals = 0 }: TipProps & { unit: string; k: string; decimals?: number }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tt">
      <div className="muted" style={{ marginBottom: 2 }}>{String(d.label)}</div>
      <b className="num">{fmt(Number(d[k]), decimals)}</b> {unit}
    </div>
  );
}
