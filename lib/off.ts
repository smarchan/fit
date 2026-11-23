import type { Food } from "./types";

/** Open Food Facts → Food. Returns null when the product has no usable energy value. */
export function parseOff(p: Record<string, unknown>, code: string): Food | null {
  const nm = (p.nutriments ?? {}) as Record<string, unknown>;
  const v = (k: string): number | null => {
    const x = nm[k];
    const num = typeof x === "string" ? Number(x) : (x as number);
    return typeof num === "number" && Number.isFinite(num) && num >= 0 ? num : null;
  };
  let kcal = v("energy-kcal_100g");
  if (kcal == null) {
    const kj = v("energy-kj_100g") ?? v("energy_100g");
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null) return null;
  const name = text(p.product_name_es) ?? text(p.product_name) ?? text(p.generic_name_es) ?? text(p.generic_name) ?? "Producto sin nombre";
  const brands = Array.isArray(p.brands) ? p.brands.map(String).join(",") : p.brands;
  const brand = text(brands)?.split(",")[0]?.trim() || null;
  const servingQ = Number(p.serving_quantity);
  const ns = text(p.nutriscore_grade);
  return {
    id: code,
    name: tidy(name),
    brand,
    kcal: r1(kcal),
    protein: r1(v("proteins_100g") ?? 0),
    carbs: r1(v("carbohydrates_100g") ?? 0),
    fat: r1(v("fat_100g") ?? 0),
    sugars: r1n(v("sugars_100g")),
    satFat: r1n(v("saturated-fat_100g")),
    fiber: r1n(v("fiber_100g")),
    salt: r2n(v("salt_100g")),
    servingG: Number.isFinite(servingQ) && servingQ > 0 && servingQ < 2000 ? servingQ : null,
    servingLabel: text(p.serving_size),
    quantity: text(p.quantity)?.replace(/\s*[e℮]$/, "") ?? null,
    nutriscore: ns && /^[a-e]$/.test(ns) ? ns : null,
    nova: [1, 2, 3, 4].includes(Number(p.nova_group)) ? Number(p.nova_group) : null,
    image: httpsUrl(p.image_front_small_url) ?? httpsUrl(p.image_front_url),
    ingredients: text(p.ingredients_text_es) ?? text(p.ingredients_text),
    allergens: Array.isArray(p.allergens_tags) ? (p.allergens_tags as unknown[]).map((a) => allergen(String(a))).filter(Boolean).slice(0, 14) : [],
  };
}

export const OFF_FIELDS = [
  "code",
  "product_name",
  "product_name_es",
  "generic_name",
  "generic_name_es",
  "brands",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "quantity",
  "nutriscore_grade",
  "nova_group",
  "image_front_small_url",
  "image_front_url",
  "ingredients_text_es",
  "ingredients_text",
  "allergens_tags",
].join(",");

/** EAN-8, UPC-A, EAN-13 or GTIN-14. */
export function isBarcode(code: string) {
  return /^\d{8}$|^\d{12,14}$/.test(code);
}

const ALLERGENS: Record<string, string> = {
  gluten: "Gluten",
  milk: "Leche",
  eggs: "Huevo",
  nuts: "Frutos de cáscara",
  peanuts: "Cacahuete",
  soybeans: "Soja",
  fish: "Pescado",
  crustaceans: "Crustáceos",
  molluscs: "Moluscos",
  celery: "Apio",
  mustard: "Mostaza",
  "sesame-seeds": "Sésamo",
  "sulphur-dioxide-and-sulphites": "Sulfitos",
  lupin: "Altramuces",
};

function allergen(tag: string): string {
  const k = tag.replace(/^[a-z]{2}:/, "");
  return ALLERGENS[k] ?? "";
}

function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function tidy(s: string) {
  // OFF names are sometimes ALL CAPS: make them readable.
  return s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase() : s;
}

function httpsUrl(v: unknown): string | null {
  return typeof v === "string" && v.startsWith("https://") ? v : null;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r1n = (x: number | null) => (x == null ? null : r1(x));
const r2n = (x: number | null) => (x == null ? null : Math.round(x * 100) / 100);
