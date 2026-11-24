// Journey Foods client wrapper — talks to our /api/food proxy.
// Returns curated, UI-ready strings for meal cards.

type NutrientHit = {
  id?: string;
  ingredient_id?: string;
  name?: string;
  ingredient_name?: string;
  [k: string]: unknown;
};

type NutrientProfile = {
  name?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  sugar_g?: number;
  iron_mg?: number;
  calcium_mg?: number;
  vitamin_c_mg?: number;
  potassium_mg?: number;
  [k: string]: unknown;
};

async function jf<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/food?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function pickHit(arr: unknown): NutrientHit | null {
  if (Array.isArray(arr) && arr.length > 0) return arr[0] as NutrientHit;
  if (arr && typeof arr === "object") {
    const o = arr as Record<string, unknown>;
    if (Array.isArray(o.results) && o.results.length > 0) return o.results[0] as NutrientHit;
    if (Array.isArray(o.ingredients) && o.ingredients.length > 0) return o.ingredients[0] as NutrientHit;
    if (Array.isArray(o.data) && o.data.length > 0) return o.data[0] as NutrientHit;
  }
  return null;
}

function profileOf(payload: unknown): NutrientProfile | null {
  if (!payload || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  if (o.nutrients && typeof o.nutrients === "object") return o.nutrients as NutrientProfile;
  if (o.data && typeof o.data === "object") return o.data as NutrientProfile;
  return o as NutrientProfile;
}

function fmtNum(n: unknown, digits = 0): string | null {
  if (typeof n !== "number" || !isFinite(n)) return null;
  return n.toFixed(digits);
}

/** Generate 2-3 short, varied nutritional facts for an ingredient. */
function factsFrom(ingredient: string, p: NutrientProfile | null): string[] {
  const facts: string[] = [];
  const cap = ingredient.charAt(0).toUpperCase() + ingredient.slice(1);

  if (p) {
    const protein = fmtNum(p.protein_g, 1);
    const fiber = fmtNum(p.fiber_g, 1);
    const ironMg = fmtNum(p.iron_mg, 1);
    const vitC = fmtNum(p.vitamin_c_mg, 0);
    const potass = fmtNum(p.potassium_mg, 0);
    const calcium = fmtNum(p.calcium_mg, 0);
    const cals = fmtNum(p.calories, 0);

    if (protein && Number(protein) > 0) facts.push(`${cap} brings ${protein}g protein per serving`);
    if (fiber && Number(fiber) > 0) facts.push(`${fiber}g fiber — keeps you full longer`);
    if (vitC && Number(vitC) > 0) facts.push(`${vitC}mg vitamin C, immune fuel`);
    if (ironMg && Number(ironMg) > 0) facts.push(`${ironMg}mg iron — energy on a plate`);
    if (potass && Number(potass) > 0) facts.push(`${potass}mg potassium for the muscles`);
    if (calcium && Number(calcium) > 0) facts.push(`${calcium}mg calcium per serving`);
    if (facts.length === 0 && cals) facts.push(`About ${cals} kcal per serving`);
  }

  // Fall back to curated facts so the card never looks empty
  if (facts.length < 2) {
    const fallbacks = curatedFallbacks(ingredient);
    for (const f of fallbacks) {
      if (!facts.includes(f)) facts.push(f);
      if (facts.length >= 3) break;
    }
  }
  return facts.slice(0, 3);
}

function curatedFallbacks(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes("bean") || n.includes("lentil") || n.includes("chickpea"))
    return ["High in plant protein and fiber", "Keeps blood sugar steady", "Wallet-friendly protein"];
  if (n.includes("kale") || n.includes("spinach") || n.includes("greens"))
    return ["Loaded with vitamin K & A", "Iron-rich leafy green", "Antioxidants in every bite"];
  if (n.includes("tomato"))
    return ["Lycopene-rich, heart-friendly", "Vitamin C boost", "Naturally low-calorie"];
  if (n.includes("egg"))
    return ["Complete protein in one bite", "Choline for the brain", "All 9 essential amino acids"];
  if (n.includes("pasta") || n.includes("spaghetti") || n.includes("noodle"))
    return ["Slow-release carbs for energy", "Pairs with almost any sauce", "Comfort food, on budget"];
  if (n.includes("avocado"))
    return ["Heart-healthy monounsaturated fats", "Potassium beats a banana", "Fiber-packed"];
  if (n.includes("lemon") || n.includes("citrus"))
    return ["Vitamin C powerhouse", "Brightens any dish", "Naturally sugar-free"];
  if (n.includes("bread") || n.includes("sourdough"))
    return ["Fermented for easier digestion", "Lower glycemic than white bread", "B-vitamins included"];
  if (n.includes("olive oil"))
    return ["Polyphenol-rich, anti-inflammatory", "Heart-healthy fat", "Mediterranean staple"];
  if (n.includes("garlic") || n.includes("onion"))
    return ["Natural immune boosters", "Prebiotic for gut health", "Big flavor, zero calories"];
  if (n.includes("herb") || n.includes("basil") || n.includes("parsley"))
    return ["Concentrated antioxidants", "Zero-calorie flavor", "Fresh phytonutrients"];
  if (n.includes("rice"))
    return ["Easy-digest carbs", "Naturally gluten-free", "Pairs with everything"];
  if (n.includes("chicken"))
    return ["Lean complete protein", "B-vitamins for energy", "Versatile + affordable"];
  if (n.includes("fish") || n.includes("salmon"))
    return ["Omega-3s for brain & heart", "High-quality protein", "Naturally low-carb"];
  return ["Nutrient-dense whole food", "Real, recognizable ingredient", "Budget-friendly staple"];
}

/** Look up Journey Foods nutrient data and produce 2–3 UI facts. */
export async function getNutritionFacts(ingredient: string): Promise<string[]> {
  if (!ingredient) return [];
  try {
    const search = await jf<unknown>(`/nutrients/search/${encodeURIComponent(ingredient)}`);
    const hit = pickHit(search);
    const id = hit?.id ?? hit?.ingredient_id;
    let profile: NutrientProfile | null = null;
    if (typeof id === "string" || typeof id === "number") {
      const detail = await jf<unknown>(`/nutrients/${encodeURIComponent(String(id))}`);
      profile = profileOf(detail);
    }
    return factsFrom(ingredient, profile);
  } catch {
    return factsFrom(ingredient, null);
  }
}

/** Pick a "hero" ingredient name from a meal (first produce / protein, else first). */
export function heroIngredient(ingredientNames: string[]): string {
  const priority = ["bean", "kale", "spinach", "egg", "avocado", "salmon", "chicken", "tomato", "pasta", "lentil"];
  for (const p of priority) {
    const hit = ingredientNames.find((n) => n.toLowerCase().includes(p));
    if (hit) return hit;
  }
  return ingredientNames[0] ?? "";
}
