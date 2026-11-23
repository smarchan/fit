import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOff, isBarcode } from "../lib/off.ts";
import { mapHevy, mapStrava, overlaps, stravaType } from "../lib/integrations.ts";
import { date, entryInput, localDate, profileInput, Invalid } from "../lib/validate.ts";
import { searchGeneric } from "../lib/generic.ts";

test("parses an Open Food Facts product", () => {
  const f = parseOff(
    {
      product_name_es: "NUTELLA CREMA DE CACAO",
      brands: "Ferrero, Nutella",
      nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, sugars_100g: 56.3, salt_100g: 0.107 },
      serving_quantity: "15",
      serving_size: "15 g",
      nutriscore_grade: "e",
      nova_group: 4,
      image_front_small_url: "https://images.openfoodfacts.org/x.jpg",
      allergens_tags: ["en:milk", "en:nuts", "en:unknown"],
    },
    "3017620422003",
  )!;
  assert.equal(f.name, "Nutella crema de cacao");
  assert.equal(f.brand, "Ferrero");
  assert.deepEqual([f.kcal, f.protein, f.carbs, f.fat, f.salt], [539, 6.3, 57.5, 30.9, 0.11]);
  assert.equal(f.servingG, 15);
  assert.equal(f.nutriscore, "e");
  assert.deepEqual(f.allergens, ["Leche", "Frutos de cáscara"]);
});

test("falls back to kJ and rejects products without energy", () => {
  assert.equal(parseOff({ product_name: "X", nutriments: { "energy-kj_100g": 418.4 } }, "12345678")!.kcal, 100);
  assert.equal(parseOff({ product_name: "X", nutriments: {} }, "12345678"), null);
});

test("barcode format", () => {
  assert.ok(isBarcode("3017620422003"));
  assert.ok(isBarcode("12345678"));
  assert.ok(!isBarcode("123"));
  assert.ok(!isBarcode("abc12345678"));
});

test("maps a Hevy workout", () => {
  const w = mapHevy(
    {
      id: "h1",
      title: "Push",
      start_time: "2026-11-22T23:30:00Z",
      end_time: "2026-11-23T00:30:00Z",
      exercises: [{ title: "Press banca", sets: [{ type: "warmup", weight_kg: 40, reps: 10 }, { type: "normal", weight_kg: 80, reps: 8 }, { type: "normal", weight_kg: 80, reps: 6 }] }],
    },
    80,
    "Europe/Madrid",
  )!;
  assert.equal(w.date, "2026-11-23"); // 00:30 in Madrid
  assert.equal(w.minutes, 60);
  assert.equal(w.kcal, 320);
  assert.deepEqual(w.details, { sets: 2, volumeKg: 1120, exercises: ["Press banca"] });
});

test("maps Strava activities with the best available kcal", () => {
  const base = { id: 9, start_date: "2026-11-23T07:00:00Z", start_date_local: "2026-11-23T08:00:00Z", moving_time: 3600 };
  const ride = mapStrava({ ...base, sport_type: "Ride", kilojoules: 800, distance: 30000 }, 80)!;
  assert.deepEqual([ride.type, ride.kcal, ride.kcalSource, ride.distanceKm, ride.date], ["bici", 720, "device", 30, "2026-11-23"]);
  const run = mapStrava({ ...base, sport_type: "Run", distance: 10000 }, 80)!;
  assert.deepEqual([run.type, run.kcal, run.kcalSource], ["correr", 800, "distance"]);
  const swim = mapStrava({ ...base, sport_type: "Swim", calories: 600 }, 80)!;
  assert.deepEqual([swim.type, swim.kcal], ["natacion", 520]);
  assert.equal(stravaType({ sport_type: "Yoga" }), "otro");
});

test("overlap detection", () => {
  const r = [{ start: Date.parse("2026-11-23T10:00:00Z"), end: Date.parse("2026-11-23T11:00:00Z") }];
  assert.ok(overlaps("2026-11-23T10:10:00Z", 55, r));
  assert.ok(!overlaps("2026-11-23T10:50:00Z", 60, r));
});

test("validation", () => {
  assert.equal(date("2026-02-28"), "2026-02-28");
  assert.throws(() => date("2026-02-30"), Invalid);
  assert.throws(() => entryInput({ date: "2026-11-23", meal: "cena", name: "x", grams: 0, kcal: 10 }), Invalid);
  const e = entryInput({ date: "2026-11-23", meal: "cena", name: " Arroz ", grams: "80,5", kcal: 360, image: "http://x" });
  assert.deepEqual([e.name, e.grams, e.image, e.protein], ["Arroz", 80.5, null, 0]);
  assert.deepEqual(profileInput({ weightKg: "", goalDelta: -300, tz: "Nope/Zone" }), { weightKg: null, goalDelta: -300 });
  assert.equal(localDate(new Date("2026-11-23T23:30:00Z"), "Europe/Madrid"), "2026-11-24");
});

test("generic food search ignores accents", () => {
  assert.equal(searchGeneric("platano")[0].name, "Plátano");
  assert.ok(searchGeneric("pollo").length >= 3);
});
