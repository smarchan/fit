import "server-only";
import type { Db } from "./db";
import type { Food } from "../types";
import { cacheFood, cachedFood } from "./repo";
import { OFF_FIELDS, parseOff } from "../off";

const UA = "Fit/1.0 (app personal de nutricion; https://github.com/smarchan/smarchan-fit)";

/** Product by barcode: DB cache (30 days) → Open Food Facts. null = not found, "error" = OFF unavailable. */
export async function lookupBarcode(db: Db, code: string): Promise<Food | null | "error"> {
  const found = await lookupOne(db, code);
  // Scanners read UPC-A as 12 digits; OFF usually stores it as EAN-13 with a leading zero.
  if (found === null && code.length === 12) {
    const alt = await lookupOne(db, "0" + code);
    return alt && alt !== "error" ? { ...alt, id: code } : alt;
  }
  return found;
}

async function lookupOne(db: Db, code: string): Promise<Food | null | "error"> {
  const hit = await cachedFood(db, code);
  if (hit) return hit;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`, {
      headers: { "user-agent": UA, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 404) return null;
    if (!r.ok) return "error";
    const j = (await r.json()) as { status?: number; product?: Record<string, unknown> };
    if (j.status !== 1 || !j.product) return null;
    const food = parseOff(j.product, code);
    if (food) await cacheFood(db, food);
    return food;
  } catch {
    return "error";
  }
}

/** Text search, products sold in Spain first. Empty on failure: callers still have local results. */
export async function searchOff(q: string): Promise<Food[]> {
  try {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", `${q} countries_tags:"en:spain"`);
    url.searchParams.set("page_size", "24");
    url.searchParams.set("langs", "es");
    url.searchParams.set("fields", OFF_FIELDS);
    const r = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { hits?: Record<string, unknown>[] };
    return (j.hits ?? []).map((h) => parseOff(h, String(h.code ?? ""))).filter((f): f is Food => !!f && /^\d{8,14}$/.test(f.id));
  } catch {
    return [];
  }
}
