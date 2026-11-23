export function addDays(d: string, k: number): string {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + k);
  return x.toISOString().slice(0, 10);
}

/** Today's date in the browser's time zone. */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const wdFmt = new Intl.DateTimeFormat("es-ES", { weekday: "narrow", timeZone: "UTC" });

export function dayLabel(d: string, today = todayLocal()): string {
  if (d === today) return "Hoy";
  if (d === addDays(today, -1)) return "Ayer";
  if (d === addDays(today, 1)) return "Mañana";
  const s = dayFmt.format(new Date(d + "T12:00:00Z"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const shortDate = (d: string) => shortFmt.format(new Date(d + "T12:00:00Z")).replace(".", "");
export const weekdayLetter = (d: string) => wdFmt.format(new Date(d + "T12:00:00Z")).toUpperCase();
