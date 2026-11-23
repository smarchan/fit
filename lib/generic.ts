import type { Food } from "./types";

/** Common foods without a barcode. Values per 100 g (BEDCA / USDA FoodData Central, rounded). */
const RAW: [string, number, number, number, number, number?, string?][] = [
  // name, kcal, protein, carbs, fat, servingG, servingLabel
  ["Pechuga de pollo (cruda)", 110, 23, 0, 1.5, 150, "1 filete"],
  ["Pechuga de pollo (a la plancha)", 165, 31, 0, 3.6, 120, "1 filete"],
  ["Muslo de pollo asado (sin piel)", 180, 25, 0, 8.6, 100, "1 muslo"],
  ["Ternera magra (cruda)", 130, 21, 0, 5, 150, "1 filete"],
  ["Carne picada mixta", 250, 17, 0, 20, 125],
  ["Lomo de cerdo (crudo)", 140, 21, 0, 6, 120, "1 filete"],
  ["Salmón", 208, 20, 0, 13, 150, "1 lomo"],
  ["Merluza", 72, 16, 0, 1, 150, "1 lomo"],
  ["Atún al natural (escurrido)", 116, 26, 0, 1, 56, "1 lata"],
  ["Gambas / langostinos", 85, 20, 0, 0.5, 100],
  ["Huevo", 143, 12.6, 0.7, 9.5, 55, "1 huevo"],
  ["Claras de huevo", 52, 11, 0.7, 0.2, 100],
  ["Jamón serrano", 240, 31, 0.5, 13, 30, "3 lonchas"],
  ["Jamón cocido", 105, 18, 1.5, 3, 30, "2 lonchas"],
  ["Tofu", 120, 13, 2, 7, 100],
  ["Arroz blanco (crudo)", 360, 7, 79, 0.6, 80, "1 ración"],
  ["Arroz blanco (cocido)", 130, 2.7, 28, 0.3, 200, "1 plato"],
  ["Pasta (cruda)", 357, 12.5, 72, 1.5, 80, "1 ración"],
  ["Pasta (cocida)", 158, 5.8, 31, 0.9, 200, "1 plato"],
  ["Quinoa (cocida)", 120, 4.4, 21, 1.9, 150],
  ["Copos de avena", 375, 13, 60, 7, 40, "1 ración"],
  ["Pan blanco (barra)", 270, 9, 55, 1.6, 60, "1 trozo"],
  ["Pan integral", 250, 10, 43, 3.5, 60, "1 trozo"],
  ["Pan de molde", 265, 8, 49, 3.6, 30, "1 rebanada"],
  ["Tortitas de arroz", 387, 8, 81, 2.8, 9, "1 tortita"],
  ["Patata (cruda)", 77, 2, 17, 0.1, 200, "1 patata"],
  ["Boniato", 86, 1.6, 20, 0.1, 200],
  ["Lentejas (cocidas)", 116, 9, 20, 0.4, 200, "1 plato"],
  ["Garbanzos (cocidos)", 164, 8.9, 27, 2.6, 200, "1 plato"],
  ["Alubias (cocidas)", 127, 8.7, 22.8, 0.5, 200, "1 plato"],
  ["Aceite de oliva", 884, 0, 0, 100, 10, "1 cucharada"],
  ["Mantequilla", 717, 0.9, 0.1, 81, 10],
  ["Aguacate", 160, 2, 8.5, 14.7, 70, "½ aguacate"],
  ["Almendras", 579, 21, 22, 50, 30, "1 puñado"],
  ["Nueces", 654, 15, 14, 65, 30, "1 puñado"],
  ["Crema de cacahuete", 588, 25, 20, 50, 15, "1 cucharada"],
  ["Hummus", 166, 7.9, 14, 9.6, 50],
  ["Leche entera", 64, 3.2, 4.7, 3.6, 250, "1 vaso"],
  ["Leche semidesnatada", 46, 3.3, 4.8, 1.6, 250, "1 vaso"],
  ["Leche desnatada", 35, 3.4, 5, 0.1, 250, "1 vaso"],
  ["Yogur natural", 61, 3.5, 4.7, 3.3, 125, "1 yogur"],
  ["Yogur griego natural", 125, 6, 4, 10, 125, "1 yogur"],
  ["Queso fresco", 180, 12, 3, 13, 60],
  ["Queso curado", 400, 26, 0.5, 33, 30],
  ["Requesón", 98, 11, 3.4, 4.3, 100],
  ["Proteína whey (polvo)", 380, 78, 8, 6, 30, "1 cacito"],
  ["Plátano", 89, 1.1, 23, 0.3, 120, "1 plátano"],
  ["Manzana", 52, 0.3, 14, 0.2, 180, "1 manzana"],
  ["Naranja", 47, 0.9, 12, 0.1, 180, "1 naranja"],
  ["Pera", 57, 0.4, 15, 0.1, 170, "1 pera"],
  ["Kiwi", 61, 1.1, 15, 0.5, 75, "1 kiwi"],
  ["Fresas", 32, 0.7, 7.7, 0.3, 150],
  ["Arándanos", 57, 0.7, 14.5, 0.3, 100],
  ["Uvas", 69, 0.7, 18, 0.2, 150],
  ["Sandía", 30, 0.6, 7.6, 0.2, 300, "1 tajada"],
  ["Melón", 34, 0.8, 8, 0.2, 250, "1 tajada"],
  ["Tomate", 18, 0.9, 3.9, 0.2, 120, "1 tomate"],
  ["Lechuga", 15, 1.4, 2.9, 0.2, 80],
  ["Brócoli", 34, 2.8, 7, 0.4, 150],
  ["Espinacas", 23, 2.9, 3.6, 0.4, 100],
  ["Zanahoria", 41, 0.9, 10, 0.2, 80, "1 zanahoria"],
  ["Pepino", 15, 0.7, 3.6, 0.1, 150],
  ["Cebolla", 40, 1.1, 9.3, 0.1, 100],
  ["Pimiento", 31, 1, 6, 0.3, 150],
  ["Calabacín", 17, 1.2, 3.1, 0.3, 200],
  ["Champiñones", 22, 3.1, 3.3, 0.3, 100],
  ["Tortilla de patatas", 190, 6.5, 14, 12, 150, "1 pincho"],
  ["Pizza", 266, 11, 33, 10, 125, "2 porciones"],
  ["Chocolate negro 70 %", 600, 7.8, 46, 43, 20, "2 onzas"],
  ["Miel", 304, 0.3, 82, 0, 20, "1 cucharada"],
  ["Azúcar", 400, 0, 100, 0, 8, "1 sobre"],
  ["Cerveza", 43, 0.5, 3.6, 0, 330, "1 lata"],
  ["Vino tinto", 85, 0.1, 2.6, 0, 150, "1 copa"],
  ["Refresco de cola", 42, 0, 10.6, 0, 330, "1 lata"],
];

export const GENERIC: Food[] = RAW.map(([name, kcal, protein, carbs, fat, servingG, servingLabel]) => ({
  id: "g:" + slug(name),
  name,
  brand: null,
  kcal,
  protein,
  carbs,
  fat,
  sugars: null,
  satFat: null,
  fiber: null,
  salt: null,
  servingG: servingG ?? null,
  servingLabel: servingLabel ?? null,
  quantity: null,
  nutriscore: null,
  nova: null,
  image: null,
  ingredients: null,
  allergens: [],
}));

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function slug(s: string) {
  return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function searchGeneric(q: string, limit = 8): Food[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return GENERIC.filter((f) => {
    const n = norm(f.name);
    return words.every((w) => n.includes(w));
  }).slice(0, limit);
}
