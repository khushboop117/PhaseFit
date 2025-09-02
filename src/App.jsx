import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Salad, Dumbbell, Quote, Laugh, LogOut, Sparkles,
  ShoppingBasket, RefreshCcw
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const USE_BACKEND = true;
// If you deploy under a custom domain/path, you can set VITE_API_BASE, else keep empty:
const API_BASE = import.meta.env.VITE_API_BASE || "";

/* =============== time & phase helpers =============== */
function daysSince(iso) {
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
function getPhase(lastPeriodISO, cycleLength = 28, manualDay) {
  if (manualDay) return { name: phaseFromDay(manualDay), dayInCycle: manualDay, daysSince: null };
  const d = daysSince(lastPeriodISO);
  if (d == null || !cycleLength) return { name: "Unknown", dayInCycle: 0, daysSince: null };
  const dayInCycle = (d % cycleLength) + 1; // ok even if delayed
  return { name: phaseFromDay(dayInCycle), dayInCycle, daysSince: d };
}
function isoToLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function localDateToISO(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =============== content quality & safety =============== */
const GENERIC_PATTERNS = [
  /\bprotein\b/i, /\bcarb(s)?\b/i, /\bgrain(s)?\b/i, /\bveg(etable|gies)?\b/i,
  /\bbalanced\b/i, /complex carb/i, /your choice/i, /snack box/i, /\b(bowl|plate)\b/i,
];
const hasGeneric = (text="") => GENERIC_PATTERNS.some(rx => rx.test(text));

function bannedTokensForDiet(diet) {
  const meats = [
    "chicken","fish","salmon","tuna","shrimp","prawn","beef","pork","lamb","turkey","mutton","anchovy","sardine"
  ];
  const eggs = ["egg","eggs","omelet","omelette","scrambled eggs","boiled egg"];
  const dairy = [
    "milk","cheese","yogurt","paneer","butter","ghee","cream","ice cream","mozzarella","feta","parmesan","cottage cheese","whey","casein","buttermilk"
  ];
  if (diet === "vegan") return [...meats, ...eggs, ...dairy, "honey"];
  if (diet === "vegetarian") return [...meats];
  if (diet === "eggs_ok")    return [...meats];
  return [];
}
function forbiddenForPCOS() {
  return [
    "white bread","white rice","pastry","cake","cookies","donut","soda","soft drink","cola","juice",
    "syrup","candy","sweets","milkshake","fries","fried","instant noodles","cornflakes","sugary",
    "sugar","jaggery","molasses"
  ];
}
function stripFences(s="") {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}
function deriveGrocery(plan) {
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
function findMismatches(plan, profile) {
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

/* ALLOWED list to guide the model (still AI-generated, not hardcoded menus) */
function allowedFoods(profile) {
  const base = new Set([
    // veg & fruit
    "spinach","kale","broccoli","cauliflower","tomato","cucumber","mushroom","bell pepper","onion","garlic",
    "berries","banana","apple","orange","avocado","carrot","zucchini","beetroot",
    // legumes & protein
    "lentils","chickpeas","kidney beans","black beans","tofu","tempeh","edamame","peas","seitan",
    // grains (low-GI first)
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

/* human-readable error */
function humanizeProviderError(s = "") {
  const msg = s.toLowerCase();
  if (msg.includes("401")) return "Unauthorized (check API key & provider)";
  if (msg.includes("incorrect api key") || msg.includes("invalid api key")) return "Invalid API key";
  if (msg.includes("429")) return "Rate limit / quota exceeded";
  if (msg.includes("404") && msg.includes("model")) return "Model not found for this provider";
  if (msg.includes("access")) return "Access denied (org/project/billing)";
  return "Network or provider issue";
}

/* =============== small UI helpers =============== */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}>{children}</div>
);
const Header = ({ children }) => (
  <h2 className="text-xl font-semibold tracking-tight text-slate-900">{children}</h2>
);
const Badge = ({ children, tone="pink" }) => {
  const map = {
    pink: "bg-pink-100 text-pink-800 border-pink-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border ${map[tone]}`}>
      {children}
    </span>
  );
};

/* =============== Tag input (chips) =============== */
function TagInput({ label, values, onChange, placeholder }) {
  const [val, setVal] = useState("");
  const add = (t) => {
    const v = (t || "").trim();
    if (!v) return;
    if (values.includes(v.toLowerCase())) return;
    onChange([...values, v.toLowerCase()]);
    setVal("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(val);
    }
    if (e.key === "Backspace" && !val && values.length) {
      onChange(values.slice(0, -1));
    }
  };
  return (
    <div className="text-sm text-slate-700 col-span-2">
      <div className="mb-1">{label}</div>
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-lg">
        {values.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">
            {t}
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              aria-label={`remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[10ch] outline-none"
          type="text"
          value={val}
          onChange={(e)=>setVal(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          inputMode="text"
        />
        <button type="button" className="px-2 py-1 rounded-md border bg-white" onClick={() => add(val)}>
          Add
        </button>
      </div>
      <div className="text-xs text-slate-500 mt-1">Press Enter or comma to add each item.</div>
    </div>
  );
}

/* =============== Provider settings =============== */
const PROVIDERS = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    label: "OpenAI",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.1-70b-versatile",
    label: "Groq (Llama-3.1-70B)",
  },
};
function loadApiSettings() {
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
      model: PROVIDERS.openai.defaultModel,
    };
  }
}

/* =============== APP =============== */
export default function App() {
  const [view, setView] = useState("dashboard"); // dashboard | planner | tracker
  const [user, setUser] = useState({ name: "boo", email: "demo@phasefit.app" });

  /* profile */
  const [profile, setProfile] = useState({
    goal: "energy",
    diet: "vegetarian",   // vegetarian | vegan | eggs_ok | nonveg
    dislikes: [],
    allergies: [],
    has_pcos: false,
    cycle_length: 28,
    last_period: "",
  });

  /* manual day */
  const [useManualDay, setUseManualDay] = useState(false);
  const [manualDay, setManualDay] = useState("");

  const phase = useMemo(
    () =>
      getPhase(
        profile.last_period,
        Number(profile.cycle_length || 28),
        useManualDay ? Number(manualDay) : null
      ),
    [profile.last_period, profile.cycle_length, useManualDay, manualDay]
  );
  const daysSinceLP = phase.daysSince ?? daysSince(profile.last_period);
  const delayDays =
    daysSinceLP != null && profile.cycle_length
      ? Math.max(0, daysSinceLP - Number(profile.cycle_length))
      : 0;

  /* AI settings & state */
  const initialApi = loadApiSettings();
  const [apiProvider, setApiProvider] = useState(initialApi.provider);
  const [apiKey, setApiKey] = useState(initialApi.key);
  const [apiModel, setApiModel] = useState(initialApi.model);
  const [showApiModal, setShowApiModal] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [diagMsg, setDiagMsg] = useState("");

  /* invalidate plans when profile changes */
  const [todayPlan, setTodayPlan] = useState(null);
  const [weekPlan, setWeekPlan] = useState(null);
  const [daysCount, setDaysCount] = useState(7);
  const [showGrocery, setShowGrocery] = useState(false);

  useEffect(() => { setTodayPlan(null); }, [
    profile.goal, profile.diet, profile.has_pcos,
    profile.last_period, profile.cycle_length,
    useManualDay, manualDay,
    JSON.stringify(profile.dislikes),
    JSON.stringify(profile.allergies),
  ]);
  useEffect(() => { setWeekPlan(null); }, [
    profile.goal, profile.diet, profile.has_pcos,
    profile.last_period, profile.cycle_length,
    useManualDay, manualDay,
    JSON.stringify(profile.dislikes),
    JSON.stringify(profile.allergies),
    daysCount
  ]);

  /* ---------- API call helpers ---------- */
  async function providerCall(messages, { maxTokens = 900 } = {}) {
    if (USE_BACKEND) {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: apiProvider,                 // "openai" | "groq" | "openrouter"
          model: apiModel || PROVIDERS[apiProvider].defaultModel,
          messages,
          temperature: 0.8,
          max_tokens: maxTokens,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try { const j = JSON.parse(raw); detail = j.error?.message || j.message || raw; } catch {}
        throw new Error(`${res.status} ${detail}`);
      }
      const data = JSON.parse(raw);
      const content = stripFences(data.choices?.[0]?.message?.content || "{}");
      return JSON.parse(content);
    }

    // (fallback: old direct-to-provider code; you can keep it if you like)
    const cfg = PROVIDERS[apiProvider];
    const key = (apiKey || "").trim();
    if (!key) throw new Error("401 No API key set");
    const res = await fetch(cfg.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: apiModel || cfg.defaultModel,
        messages,
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = raw;
      try { const j = JSON.parse(raw); detail = j.error?.message || j.message || raw; } catch {}
      throw new Error(`${res.status} ${detail}`);
    }
    const data = JSON.parse(raw);
    const content = stripFences(data.choices?.[0]?.message?.content || "{}");
    return JSON.parse(content);
  }


  function buildPrimaryPrompt(days) {
    return `
PROFILE:
${JSON.stringify({
  goal: profile.goal,
  diet: profile.diet,
  dislikes: profile.dislikes,
  allergies: profile.allergies,
  has_pcos: profile.has_pcos,
  cycle_length: profile.cycle_length,
  phase: `${phase.name} (day ${phase.dayInCycle})`,
})}

ALLOWED_FOODS (use only from these, combine creatively):
${JSON.stringify(allowedFoods(profile))}

FORBIDDEN (never include any of these words/ingredients):
${JSON.stringify([
  ...bannedTokensForDiet(profile.diet),
  ...(profile.has_pcos ? forbiddenForPCOS() : []),
  ...(profile.dislikes || []),
  ...(profile.allergies || []),
])}

GOAL RULES:
- energy: include iron/B12 sources, complex carbs; avoid heavy/fried.
- fat_loss: 400–600 kcal/meal, 25–35 g protein; lower added sugar.
- strength: ~30–40 g protein/meal; complex carbs around training.
- symptom_relief: anti-inflammatory (omega-3, turmeric, ginger), magnesium; easy to digest.

PCOS RULES (if has_pcos=true):
- Prefer low-GI carbs (oats/quinoa/brown rice/legumes); high fiber; protein each meal.
- Avoid sugary drinks/desserts and refined grains.

GENERAL RULES:
- Respect DIET: ${profile.diet}.
- STRICTLY exclude all FORBIDDEN tokens.
- Use SPECIFIC dishes with PORTIONS, e.g., "Avocado sandwich (2 slices whole-grain, 1/2 avocado, 2 eggs)".
- No vague terms ("protein", "carbs", "balanced bowl", "your choice", "snack box").
- Keep each meal under ~90 chars and workout under ~60 chars.

TASK:
Create a ${days}-day plan. For each day include:
  - label: "Day N • ${phase.name}" (or actual phase if you recompute)
  - meals: { breakfast, lunch, dinner, snack } (strings as above)
  - workout: short string aligned to phase
Also return a deduplicated grocery list from ALLOWED_FOODS used.

OUTPUT JSON ONLY in this exact schema:
{
  "days": [
    {
      "label": "Day 1 • PhaseName",
      "meals": { "breakfast": "", "lunch": "", "dinner": "", "snack": "" },
      "workout": ""
    }
  ],
  "grocery": ["item1","item2","..."]
}`.trim();
  }

  async function fetchAIPlan(days = 1) {
    setAiBusy(true);
    setAiError("");
    try {
      const primary = [
        { role: "system", content: "You are a licensed diet & fitness coach. Output STRICT JSON only." },
        { role: "user", content: buildPrimaryPrompt(days) },
      ];
      let plan = await providerCall(primary);

      // validate + refine if needed
      const issues = findMismatches(plan, profile);
      if (issues.length > 0) {
        const refine = [
          ...primary,
          { role: "assistant", content: JSON.stringify(plan) },
          {
            role: "user",
            content: `
Your previous JSON had these issues that MUST be fixed:
${issues.map(x => "- " + x).join("\n")}
Rewrite ONLY the plan JSON, same schema, with concrete dish names + portions.
No generic wording. Output STRICT JSON only.`.trim(),
          },
        ];
        const refined = await providerCall(refine);
        plan = refined;
      }
      if (!plan.grocery || !plan.grocery.length) plan.grocery = deriveGrocery(plan);
      return plan;
    } catch (e) {
      console.warn("AI plan failed:", e?.message || e);
      setAiError(humanizeProviderError(e?.message || String(e)));
      return null;
    } finally {
      setAiBusy(false);
    }
  }

  // Per-meal alternative (swap) – AI generated
  async function fetchAlternative(mealKey, currentText, dayLabel) {
    setAiBusy(true);
    setAiError("");
    try {
      const messages = [
        { role: "system", content: "You are a licensed diet & fitness coach. Output STRICT JSON only." },
        {
          role: "user",
          content: `
We have a daily plan for ${dayLabel}. Replace ONLY the ${mealKey} with 1 new option.
Keep all constraints.

PROFILE:
${JSON.stringify({
  goal: profile.goal,
  diet: profile.diet,
  dislikes: profile.dislikes,
  allergies: profile.allergies,
  has_pcos: profile.has_pcos,
  phase: `${phase.name} (day ${phase.dayInCycle})`,
})}

ALLOWED_FOODS: ${JSON.stringify(allowedFoods(profile))}
FORBIDDEN: ${JSON.stringify([
  ...bannedTokensForDiet(profile.diet),
  ...(profile.has_pcos ? forbiddenForPCOS() : []),
  ...(profile.dislikes || []),
  ...(profile.allergies || []),
])}

RULES:
- Specific dish with portions, ≤90 chars.
- No vague terms (protein/carb/balanced/etc.).
- Respect diet and avoid all forbidden tokens.

Return STRICT JSON:
{"new_meal": "string"}
`.trim()
        }
      ];
      const out = await providerCall(messages);
      const val = out?.new_meal || "";
      if (!val) throw new Error("No new_meal returned");

      // quick validate
      const low = val.toLowerCase();
      const bans = [
        ...bannedTokensForDiet(profile.diet),
        ...(profile.has_pcos ? forbiddenForPCOS() : []),
        ...(profile.dislikes || []),
        ...(profile.allergies || []),
      ].map(x => (x||"").toLowerCase());
      if (hasGeneric(low) || bans.some(b => b && low.includes(b))) {
        throw new Error("Alternative did not pass validation");
      }
      return val;
    } catch (e) {
      console.warn("Alternative failed:", e?.message || e);
      setAiError(humanizeProviderError(e?.message || String(e)));
      return null;
    } finally {
      setAiBusy(false);
    }
  }

  /* ---------- Actions ---------- */
  async function generateToday() {
    const plan = await fetchAIPlan(1);
    setTodayPlan(plan);
  }
  async function generateWeek() {
    const plan = await fetchAIPlan(daysCount);
    setWeekPlan(plan);
  }

  // swap one meal in Today's plan
  async function swapTodayMeal(dayIndex, mealKey) {
    if (!todayPlan) return;
    const d = todayPlan.days[dayIndex];
    const newMeal = await fetchAlternative(mealKey, d.meals[mealKey], d.label);
    if (!newMeal) return;
    const updated = JSON.parse(JSON.stringify(todayPlan));
    updated.days[dayIndex].meals[mealKey] = newMeal;
    updated.grocery = deriveGrocery(updated);
    setTodayPlan(updated);
  }

  // swap one meal in Week plan
  async function swapWeekMeal(dayIndex, mealKey) {
    if (!weekPlan) return;
    const d = weekPlan.days[dayIndex];
    const newMeal = await fetchAlternative(mealKey, d.meals[mealKey], d.label);
    if (!newMeal) return;
    const updated = JSON.parse(JSON.stringify(weekPlan));
    updated.days[dayIndex].meals[mealKey] = newMeal;
    updated.grocery = deriveGrocery(updated);
    setWeekPlan(updated);
  }

  /* ---------- Tracker ---------- */
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem("phasefit_logs");
    if (saved) setLogs(JSON.parse(saved));
  }, []);
  function logToday(entry) {
    const today = new Date().toISOString().slice(0, 10);
    const withDate = { date: today, ...entry };
    const updated = [withDate, ...logs].slice(0, 90);
    setLogs(updated);
    localStorage.setItem("phasefit_logs", JSON.stringify(updated));
  }

  /* ---------- Top bar ---------- */
  const TopBar = () => (
    <div className="max-w-6xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-pink-600" />
        <span className="text-2xl font-extrabold tracking-tight text-pink-700">PhaseFit</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <nav className="hidden sm:flex gap-2">
          <button
            onClick={() => setView("dashboard")}
            className={`px-3 py-1.5 rounded-lg border ${
              view === "dashboard"
                ? "bg-pink-100 text-pink-700 border-pink-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >Dashboard</button>
          <button
            onClick={() => setView("planner")}
            className={`px-3 py-1.5 rounded-lg border ${
              view === "planner"
                ? "bg-pink-100 text-pink-700 border-pink-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >Planner</button>
          <button
            onClick={() => setView("tracker")}
            className={`px-3 py-1.5 rounded-lg border ${
              view === "tracker"
                ? "bg-pink-100 text-pink-700 border-pink-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >Tracker</button>
        </nav>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
          onClick={() => setShowApiModal(true)}
        >
          Settings
        </button>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white text-slate-800 shadow-sm hover:bg-slate-50"
          onClick={() => setUser(null)}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );

  /* ---------- Dashboard (Today) ---------- */
  const Dashboard = () => (
    <div className="max-w-6xl mx-auto px-5 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="text-pink-600" />
            <Header>Current Phase</Header>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="pink">{phase.name}</Badge>
            <span className="text-sm text-slate-700">Day {phase.dayInCycle || "—"} of cycle</span>
          </div>
          {daysSinceLP != null && (
            <p className="text-xs text-slate-600 mt-2">
              Last period was <strong>{daysSinceLP}</strong> day(s) ago.
              {delayDays > 0 && <> Possible delay ~{delayDays} day(s); cycles can vary.</>}
              {daysSinceLP > 45 && (
                <span className="block text-amber-700 mt-1">
                  If your bleed hasn’t started in over 45 days, consider speaking with a clinician.
                </span>
              )}
            </p>
          )}
        </Card>

        <Card>
          <Header>Your Profile</Header>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <label className="text-sm text-slate-700">
              Goal
              <select
                className="mt-1 p-2 border rounded-lg w-full"
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
              >
                <option value="energy">Boost Energy</option>
                <option value="fat_loss">Fat Loss</option>
                <option value="strength">Strength</option>
                <option value="symptom_relief">Symptom Relief</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Diet
              <select
                className="mt-1 p-2 border rounded-lg w-full"
                value={profile.diet}
                onChange={(e) => setProfile({ ...profile, diet: e.target.value })}
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="eggs_ok">Vegetarian + Eggs</option>
                <option value="nonveg">Non-Vegetarian</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Cycle length
              <select
                className="mt-1 p-2 border rounded-lg w-full"
                value={profile.cycle_length}
                onChange={(e) =>
                  setProfile({ ...profile, cycle_length: Number(e.target.value) })
                }
              >
                {Array.from({ length: 30 }, (_, i) => i + 16).map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Last period
              <DatePicker
                selected={isoToLocalDate(profile.last_period)}
                onChange={(date) =>
                  setProfile({ ...profile, last_period: localDateToISO(date) })
                }
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                dateFormat="yyyy-MM-dd"
                placeholderText="Select from calendar"
                className="mt-1 p-2 border rounded-lg w-full bg-white text-slate-900"
                popperPlacement="bottom-start"
              />
            </label>

            <TagInput
              label="Dislikes"
              values={profile.dislikes}
              onChange={(vals)=>setProfile({...profile, dislikes: vals})}
              placeholder="e.g., paneer, chickpeas"
            />
            <TagInput
              label="Allergies"
              values={profile.allergies}
              onChange={(vals)=>setProfile({...profile, allergies: vals})}
              placeholder="e.g., peanut, dairy"
            />

            <label className="inline-flex items-center gap-2 col-span-2 text-slate-700">
              <input
                type="checkbox"
                checked={profile.has_pcos}
                onChange={(e) => setProfile({ ...profile, has_pcos: e.target.checked })}
              />
              PCOS-aware nutrition
            </label>

            <div className="col-span-2 border-t pt-3">
              <label className="inline-flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={useManualDay}
                  onChange={(e) => setUseManualDay(e.target.checked)}
                />
                Set day in cycle manually
              </label>
              {useManualDay && (
                <input
                  className="mt-2 p-2 border rounded-lg w-full"
                  type="number"
                  min="1"
                  max={profile.cycle_length || 28}
                  placeholder={`1–${profile.cycle_length || 28}`}
                  value={manualDay}
                  onChange={(e) => setManualDay(e.target.value.replace(/[^\d]/g, ""))}
                />
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Today AI plan */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <Salad className="text-emerald-600" />
            <Header>Today’s Plan (AI)</Header>
            {aiError && <Badge tone="amber">{aiError}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button
              className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
              disabled={aiBusy}
              onClick={generateToday}
            >
              {aiBusy ? "Thinking…" : "Generate Today’s Plan"}
            </button>
          </div>

          {!todayPlan ? (
            <p className="text-slate-700 text-sm">
              Pick your <strong>Last period</strong> or a <strong>manual day</strong>, then click “Generate”.
            </p>
          ) : (
            <>
              <div className="mt-1 grid md:grid-cols-2 gap-4 text-slate-900">
                {todayPlan.days.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-slate-50">
                    <div className="font-semibold mb-2">{d.label}</div>
                    <ul className="text-sm ml-1 space-y-2">
                      {["breakfast","lunch","dinner","snack"].map((k) => (
                        <li key={k} className="flex items-start gap-2">
                          <span className="font-semibold capitalize w-20">{k}:</span>
                          <span className="flex-1">{d.meals[k]}</span>
                          <button
                            title="Suggest another option"
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white text-slate-800 hover:bg-slate-50"
                            onClick={() => swapTodayMeal(i, k)}
                          >
                            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <Card className="mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <Dumbbell className="text-indigo-600" />
                  <Header>Today’s Exercise</Header>
                </div>
                {!todayPlan.days?.[0]?.workout ? (
                  <p className="text-slate-700">No workout suggested.</p>
                ) : (
                  <div className="text-sm text-slate-900 p-2 rounded-lg border bg-indigo-50/60">
                    💪 {todayPlan.days[0].workout}
                  </div>
                )}
              </Card>
            </>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Quote className="text-amber-600" />
              <Header>Daily Quote</Header>
            </div>
            <p className="italic text-slate-800">
              “{
                [
                  "Small steps today, big changes tomorrow.",
                  "Your body is wise; listen gently.",
                  "Consistency beats intensity.",
                  "You’re doing better than you think.",
                ][phase.dayInCycle % 4 || 0]
              }”
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3 mb-2">
              <Laugh className="text-rose-600" />
              <Header>Clean Joke</Header>
            </div>
            <p className="text-slate-800">
              {
                [
                  "Why did the apple stop in the road? It ran out of juice. 🍎",
                  "Why don’t eggs tell jokes? They’d crack each other up! 🥚",
                  "I’m on a seafood diet—I see food and make a smarter swap. 😅",
                  "Treadmills: pay to walk nowhere… efficiently. 🏃‍♀️",
                ][phase.dayInCycle % 4 || 0]
              }
            </p>
          </Card>
        </div>
      </div>
    </div>
  );

  /* ---------- Planner (Week) ---------- */
  const Planner = () => (
    <div className="max-w-6xl mx-auto px-5 pb-10 space-y-6">
      <Card>
        <Header>Meal Planner</Header>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-700">
            Number of days
            <select
              className="ml-2 p-2 border rounded-lg"
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
            >
              {[3, 5, 7, 10, 14].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <button
            className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
            disabled={aiBusy}
            onClick={generateWeek}
          >
            {aiBusy ? "Thinking…" : "Generate AI Plan"}
          </button>

          {weekPlan?.grocery?.length > 0 && (
            <button
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white"
              onClick={() => setShowGrocery(true)}
            >
              <ShoppingBasket className="w-4 h-4" /> Grocery List
            </button>
          )}
        </div>
        {aiError && <p className="text-xs text-amber-700 mt-2">{aiError}</p>}
      </Card>

      {weekPlan && (
        <Card>
          <Header>{daysCount}-Day Plan</Header>
          <div className="mt-3 grid md:grid-cols-2 gap-4 text-slate-900">
            {weekPlan.days.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border bg-slate-50">
                <div className="font-semibold mb-2">{d.label}</div>
                <ul className="text-sm ml-1 space-y-2">
                  {["breakfast","lunch","dinner","snack"].map((k) => (
                    <li key={k} className="flex items-start gap-2">
                      <span className="font-semibold capitalize w-20">{k}:</span>
                      <span className="flex-1">{d.meals[k]}</span>
                      <button
                        title="Suggest another option"
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-white text-slate-800 hover:bg-slate-50"
                        onClick={() => swapWeekMeal(i, k)}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-sm">💪 {d.workout}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Grocery modal */}
      {showGrocery && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <Header>Grocery List</Header>
              <button className="px-3 py-1.5 rounded-lg border" onClick={() => setShowGrocery(false)}>
                Close
              </button>
            </div>
            <ul className="text-slate-900 list-disc ml-5 space-y-1">
              {weekPlan.grocery.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );

  /* ---------- Tracker ---------- */
  const Tracker = () => {
    const [mood, setMood] = useState(3);
    const [energy, setEnergy] = useState(3);
    const [cramps, setCramps] = useState(1);
    const [bloat, setBloat] = useState(1);
    const [notes, setNotes] = useState("");
    return (
      <div className="max-w-6xl mx-auto px-5 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Header>Log today</Header>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">Mood: {mood}
              <input type="range" min="1" max="5" value={mood}
                onChange={(e)=>setMood(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-sm">Energy: {energy}
              <input type="range" min="1" max="5" value={energy}
                onChange={(e)=>setEnergy(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-sm">Cramps: {cramps}
              <input type="range" min="0" max="3" value={cramps}
                onChange={(e)=>setCramps(Number(e.target.value))} className="w-full" />
            </label>
            <label className="block text-sm">Bloating: {bloat}
              <input type="range" min="0" max="3" value={bloat}
                onChange={(e)=>setBloat(Number(e.target.value))} className="w-full" />
            </label>
            <textarea
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Notes"
              value={notes}
              onChange={(e)=>setNotes(e.target.value)}
            />
            <button className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
              onClick={()=>logToday({mood,energy,cramps,bloat,notes})}>
              Save entry
            </button>
          </div>
        </Card>

        <Card>
          <Header>Recent entries</Header>
          <div className="mt-3 space-y-2">
            {logs.length === 0 ? (
              <p className="text-slate-700 text-sm">No logs yet.</p>
            ) : (
              logs.map((l,i)=>(
                <div key={i} className="p-2 rounded-lg border bg-slate-50 text-sm">
                  <div className="font-medium">{l.date}</div>
                  <div>Mood {l.mood} • Energy {l.energy} • Cramps {l.cramps} • Bloat {l.bloat}</div>
                  {l.notes && <div className="text-slate-700 mt-1">📝 {l.notes}</div>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    );
  };

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen text-slate-900 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      <TopBar />
      {view === "dashboard" && <Dashboard />}
      {view === "planner" && <Planner />}
      {view === "tracker" && <Tracker />}

      {/* API Settings modal */}
      {showApiModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow p-5 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">API Settings</h3>
            <label className="block text-sm text-slate-700 mb-2">
              Provider
              <select
                className="mt-1 p-2 border rounded-lg w-full"
                value={apiProvider}
                onChange={(e) => {
                  const prov = e.target.value;
                  setApiProvider(prov);
                  if (!apiModel) setApiModel(PROVIDERS[prov].defaultModel);
                }}
              >
                {Object.entries(PROVIDERS).map(([k, v]) => (
                  <option value={k} key={k}>{v.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-700 mb-2">
              Model (optional)
              <input
                className="mt-1 p-2 border rounded-lg w-full"
                placeholder={PROVIDERS[apiProvider].defaultModel}
                value={apiModel}
                onChange={(e) => setApiModel(e.target.value)}
              />
            </label>

            <label className="block text-sm text-slate-700">
              API Key
              <input
                className="mt-1 p-2 border rounded-lg w-full"
                type="password"
                placeholder="sk-… (OpenAI) or your Groq key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>

            <p className="text-xs text-slate-600 mt-2">
              Keys are stored locally in your browser for this demo.
            </p>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-1.5 rounded-lg border" onClick={() => setShowApiModal(false)}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
                onClick={() => {
                  localStorage.setItem("phasefit_api", JSON.stringify({
                    provider: apiProvider,
                    key: (apiKey || "").trim(),
                    model: apiModel || PROVIDERS[apiProvider].defaultModel,
                  }));
                  setShowApiModal(false);
                }}
              >
                Save
              </button>
            </div>

            {/* Run Quick Test */}
            <div className="flex items-center gap-2 mt-3">
              <button
                className="px-3 py-1.5 rounded-lg border bg-white"
                type="button"
                onClick={async () => {
                  setDiagMsg("Testing…");
                  try {
                    const test = await providerCall([
                      { role: "system", content: "Return STRICT JSON only." },
                      { role: "user", content: 'Output {"ok": true} exactly as JSON.' },
                    ]);
                    if (test?.ok === true) setDiagMsg("✅ Connected! Keys & model look good.");
                    else setDiagMsg("⚠️ Connected, but unexpected response. Try another model.");
                  } catch (e) {
                    setDiagMsg("❌ " + humanizeProviderError(e?.message || String(e)));
                  }
                }}
              >
                Run Quick Test
              </button>
              {diagMsg && <span className="text-xs text-slate-700">{diagMsg}</span>}
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-slate-600 pb-8">
        PhaseFit demo • Not medical advice • Designed for APB demo ✨
      </footer>
    </div>
  );
}
