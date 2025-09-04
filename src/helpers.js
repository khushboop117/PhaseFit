/* ---------------------- DATE & PHASE HELPERS ---------------------- */
export function daysSince(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const today = new Date();
  return Math.floor((today - start) / (1000 * 60 * 60 * 24));
}

function phaseFromDay(day) {
  if (!day) return "Unknown";
  if (day <= 5) return "Menstruation";
  if (day <= 13) return "Follicular";
  if (day <= 16) return "Ovulation";
  return "Luteal";
}

export function getPhase(lastPeriodISO, cycleLength = 28, manualDay) {
  if (manualDay) return { name: phaseFromDay(manualDay), dayInCycle: manualDay, daysSince: null };
  const d = daysSince(lastPeriodISO);
  if (d == null || !cycleLength) return { name: "Unknown", dayInCycle: 0, daysSince: null };
  const dayInCycle = (d % cycleLength) + 1;
  return { name: phaseFromDay(dayInCycle), dayInCycle, daysSince: d };
}

export function isoToLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function localDateToISO(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ---------------------- GENERIC DETECTION ---------------------- */
const GENERIC_PATTERNS = [
  /\bprotein\b/i, /\bcarb(s)?\b/i, /\bgrain(s)?\b/i, /\bveg(etable|gies)?\b/i,
  /\bbalanced\b/i, /complex carb/i, /your choice/i, /snack box/i, /\b(bowl|plate)\b/i,
];
export const hasGeneric = (text = "") => GENERIC_PATTERNS.some(rx => rx.test(text));

/* ---------------------- DIET RULES ---------------------- */
export function bannedTokensForDiet(diet) {
  const meats = [
    "chicken","fish","salmon","tuna","shrimp","prawn","beef","pork","lamb","turkey","mutton","anchovy","sardine"
  ];
  const eggs = ["egg","eggs","omelet","omelette","scrambled eggs","boiled egg"];
  const dairy = [
    "milk","cheese","yogurt","paneer","butter","ghee","cream","ice cream","mozzarella","feta","parmesan",
    "cottage cheese","whey","casein","buttermilk"
  ];
  if (diet === "vegan") return [...meats, ...eggs, ...dairy, "honey"];
  if (diet === "vegetarian") return [...meats];
  if (diet === "eggs_ok")    return [...meats];
  return [];
}

export function forbiddenForPCOS() {
  return [
    "white bread","white rice","pastry","cake","cookies","donut","soda","soft drink","cola","juice",
    "syrup","candy","sweets","milkshake","fries","fried","instant noodles","cornflakes","sugary",
    "sugar","jaggery","molasses"
  ];
}

/* ---------------------- CLEANUP HELPERS ---------------------- */
export function stripFences(s = "") {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}

export function deriveGrocery(plan) {
  const out = new Set();
  (plan?.days || []).forEach(d => {
    Object.values(d.meals || {}).forEach(meal => {
      (meal || "")
        .split(/[,+]/)
        .map(t => t.trim())
        .filter(t => t && t.length > 2 && !hasGeneric(t))
        .forEach(t => out.add(t[0].toUpperCase() + t.slice(1)));
    });
  });
  return Array.from(out).slice(0, 80);
}

export function findMismatches(plan, profile) {
  const bans = [
    ...bannedTokensForDiet(profile.diet),
    ...(profile.has_pcos ? forbiddenForPCOS() : []),
    ...(profile.dislikes || []),
    ...(profile.allergies || []),
  ].map(s => (s||"").toLowerCase());

  const issues = [];
  (plan?.days || []).forEach((d, di) => {
    Object.entries(d.meals || {}).forEach(([k, v]) => {
      const low = (v || "").toLowerCase();
      const bad = bans.find(b => b && low.includes(b));
      if (bad) issues.push(`Day ${di+1} ${k}: contains "${bad}"`);
      if (hasGeneric(low)) issues.push(`Day ${di+1} ${k}: too generic (${v})`);
      if (v && v.length > 120) issues.push(`Day ${di+1} ${k}: too long`);
      if ((profile.goal === "strength" || profile.goal === "fat_loss")
          && !/\b(tofu|tempeh|lentil|chickpea|bean|egg|chicken|fish|paneer|yogurt|seitan|edamame|protein)\b/i.test(low)) {
        issues.push(`Day ${di+1} ${k}: may be low protein for goal`);
      }
    });
    const w = (d.workout || "").toLowerCase();
    if (hasGeneric(w)) issues.push(`Day ${di+1} workout: too generic (${d.workout})`);
    if (d.workout && d.workout.length > 100) issues.push(`Day ${di+1} workout: too long`);
  });
  return issues;
}

export function allowedFoods(profile) {
  const base = new Set([
    // veg & fruit
    "spinach","kale","broccoli","cauliflower","tomato","cucumber","mushroom","bell pepper","onion","garlic",
    "berries","banana","apple","orange","avocado","carrot","zucchini","beetroot",
    // legumes & protein
    "lentils","chickpeas","kidney beans","black beans","tofu","tempeh","edamame","peas","seitan",
    // grains
    "oats","quinoa","brown rice","bulgur","buckwheat","millets","barley","whole-wheat bread","whole-grain wrap",
    // fats & seeds
    "olive oil","avocado oil","peanut butter","almond butter","tahini","chia","flaxseed","pumpkin seeds","walnuts","almonds","cashews",
    // extras
    "lemon","lime","ginger","turmeric","cinnamon","cocoa","herbal tea","soy milk","oat milk"
  ]);
  if (profile.diet === "eggs_ok") ["egg","eggs"].forEach(x => base.add(x));
  if (profile.diet === "vegetarian" || profile.diet === "eggs_ok") {
    ["paneer","yogurt","milk","cheese"].forEach(x => base.add(x));
  }
  if (profile.diet === "nonveg") {
    ["chicken","fish","salmon","tuna","shrimp","turkey"].forEach(x => base.add(x));
  }
  return Array.from(base);
}

export function humanizeProviderError(s = "") {
  const msg = s.toLowerCase();
  if (msg.includes("401")) return "Unauthorized (check API key & provider)";
  if (msg.includes("incorrect api key") || msg.includes("invalid api key")) return "Invalid API key";
  if (msg.includes("429")) return "Rate limit / quota exceeded";
  if (msg.includes("404") && msg.includes("model")) return "Model not found for this provider";
  if (msg.includes("access")) return "Access denied (org/project/billing)";
  return "Network or provider issue";
}

/* ---------------------- API SETTINGS ---------------------- */
export function loadApiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("phasefit_api") || "{}");
    return {
      provider: saved.provider || "openai",
      key:
        saved.key ||
        (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) ||
        "",
      model:
        saved.model ||
        PROVIDERS[saved.provider || "openai"].defaultModel,
    };
  } catch {
    return {
      provider: "openai",
      key: (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) || "",
      model: "gpt-4o-mini",
    };
  }
}
