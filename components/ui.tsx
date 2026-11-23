"use client";

import { useEffect, useRef, useState } from "react";
import { IX } from "./icons";

export function Sheet({ title, onClose, children, footer, tall, head }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; tall?: boolean; head?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet${tall ? " tall" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} style={{ position: "relative" }}>
        <span className="grab" aria-hidden="true" />
        <div className="sheet-h">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <IX />
          </button>
        </div>
        {head}
        <div className="sheet-b">{children}</div>
        {footer && <div className="sheet-f">{footer}</div>}
      </div>
    </div>
  );
}

/** Animates a number towards its new value. */
export function useTween(value: number, ms = 700): number {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    if (a === value) return;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const cur = a + (value - a) * e;
      setV(cur);
      from.current = cur;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return v;
}

export function Ring({ size, stroke, value, max, color, track = "var(--surface-3)", children }: { size: number; stroke: number; value: number; max: number; color: string; track?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const k = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - k)} opacity={k === 0 ? 0 : 1} />
      {children}
    </svg>
  );
}

export function Toast({ msg, action, onDone }: { msg: string; action?: { label: string; run: () => void }; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, action ? 5000 : 2600);
    return () => clearTimeout(t);
  }, [msg, action, onDone]);
  return (
    <div className="toast" role="status">
      {msg}
      {action && (
        <button
          onClick={() => {
            action.run();
            onDone();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function NumInput({ value, onChange, suffix, placeholder, step = "any", autoFocus, id, inputMode = "decimal" }: { value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string; step?: string; autoFocus?: boolean; id?: string; inputMode?: "decimal" | "numeric" }) {
  return (
    <div className={suffix ? "input-suffix" : undefined}>
      <input id={id} className="input num" type="text" inputMode={inputMode} value={value} placeholder={placeholder} step={step} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ""))} />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}

export const parseNum = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
