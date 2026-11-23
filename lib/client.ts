"use client";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((j as { error?: string }).error ?? "Error de conexión", r.status);
  return j as T;
}

const nf0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

/** Spanish grouping, including 4-digit numbers (2.180, not 2180). */
export function fmt(n: number, decimals = 0): string {
  const s = decimals ? nf1.format(n) : nf0.format(Math.round(n));
  const neg = s.startsWith("-");
  const [int, dec] = (neg ? s.slice(1) : s).split(",");
  const grouped = int.replace(/\./g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "−" : "") + grouped + (dec ? "," + dec : "");
}

export function signed(n: number, decimals = 0): string {
  const f = 10 ** decimals;
  const r = Math.round(n * f) / f;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + fmt(Math.abs(r), decimals);
}

export function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

/** Default meal for the current time of day. */
export function mealNow(): "desayuno" | "comida" | "merienda" | "cena" | "snacks" {
  const h = new Date().getHours();
  if (h < 11) return "desayuno";
  if (h < 16) return "comida";
  if (h < 19) return "merienda";
  if (h < 23) return "cena";
  return "snacks";
}
