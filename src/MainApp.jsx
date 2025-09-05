import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays, Salad, Dumbbell, Quote, Laugh, LogOut, Sparkles,
  ShoppingBasket, RefreshCcw
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "./supabaseClient"; // auth
import FeedbackForm from "./FeedbackForm";
import TestimonialsWall from "./TestimonialsWall";


/* =============== helpers =============== */
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
  const dayInCycle = (d % cycleLength) + 1;
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
function stripFences(s = "") {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1] : s;
}
function humanizeProviderError(s = "") {
  const msg = s.toLowerCase();
  if (msg.includes("401")) return "Unauthorized (check API key)";
  if (msg.includes("incorrect api key") || msg.includes("invalid api key")) return "Invalid API key";
  if (msg.includes("429")) return "Rate limit / quota exceeded";
  if (msg.includes("404") && msg.includes("model")) return "Model not found";
  return "Network or provider issue";
}

/* phase details */
const PHASE_DETAILS = {
  Menstruation:
    "Energy may dip. Focus on rest, hydration, iron-rich foods (lentils, spinach).",
  Follicular:
    "Estrogen rises, energy improves. Great for strength training & colorful meals.",
  Ovulation:
    "Peak energy. Favor lean protein, anti-inflammatory foods (omega-3s).",
  Luteal:
    "PMS may occur. Include magnesium-rich foods, complex carbs, calming routines.",
};

/* =============== Providers =============== */
const PROVIDERS = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    label: "OpenAI",
  },
};
function loadApiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("phasefit_api") || "{}");
    return {
      provider: saved.provider || "openai",
      key: saved.key || "",
      model: saved.model || PROVIDERS["openai"].defaultModel,
    };
  } catch {
    return { provider: "openai", key: "", model: PROVIDERS.openai.defaultModel };
  }
}

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

/* =============== MAIN APP =============== */
export default function MainApp({ user }) {
  const [view, setView] = useState("dashboard");
  const [profile, setProfile] = useState({
    goal: "energy",
    diet: "vegetarian",
    dislikes: [],
    allergies: [],
    has_pcos: false,
    cycle_length: 28,
    last_period: "",
  });
  const [useManualDay, setUseManualDay] = useState(false);
  const [manualDay, setManualDay] = useState("");
  const [todayPlan, setTodayPlan] = useState(null);
  const [weekPlan, setWeekPlan] = useState(null);
  const [daysCount, setDaysCount] = useState(7);
  const [showGrocery, setShowGrocery] = useState(false);

  const phase = useMemo(
    () =>
      getPhase(
        profile.last_period,
        Number(profile.cycle_length || 28),
        useManualDay ? Number(manualDay) : null
      ),
    [profile.last_period, profile.cycle_length, useManualDay, manualDay]
  );

  /* AI settings */
  const initialApi = loadApiSettings();
  const [apiProvider] = useState(initialApi.provider);
  const [apiModel, setApiModel] = useState(initialApi.model);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  /* ---------- API call ---------- */
  async function providerCall(messages, { maxTokens = 900 } = {}) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: apiProvider,
        model: apiModel || PROVIDERS[apiProvider].defaultModel,
        messages,
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      let detail = raw;
      try {
        const j = JSON.parse(raw);
        detail = j.error?.message || j.message || raw;
      } catch {}
      throw new Error(`${res.status} ${detail}`);
    }
    const data = JSON.parse(raw);
    const content = stripFences(data.choices?.[0]?.message?.content || "{}");
    return JSON.parse(content);
  }

  /* ---------- AI Prompts ---------- */
function buildPrimaryPrompt(days) {
  const baseProfile = {
    goal: profile.goal,
    diet: profile.diet,
    dislikes: profile.dislikes,
    allergies: profile.allergies,
    has_pcos: profile.has_pcos,
    cycle_length: profile.cycle_length,
    phase: `${phase.name} (day ${phase.dayInCycle})`,
  };

  return `
You are a diet & fitness coach. Create a ${days}-day plan tailored to the user’s hormonal phase and health conditions.

USER PROFILE:
${JSON.stringify(baseProfile)}

PHASE RULES:
- Menstruation: iron-rich foods, light yoga/rest.
- Follicular: fresh salads, complex carbs, strength training.
- Ovulation: high-protein, anti-inflammatory foods, cardio/HIIT.
- Luteal: magnesium-rich foods, complex carbs, calming routines.

${profile.has_pcos ? `IMPORTANT: The user has PCOS. Apply these strict rules:
- Prefer low-GI carbs only (oats, quinoa, brown rice, legumes).
- Include high fiber + protein at every meal.
- Avoid ALL refined sugar, soda, pastries, fried foods.
- Meals must clearly reflect these choices.` : "No PCOS-specific restrictions."}

TASK:
- Create ${days} days.
- Each day has: {label, meals: {breakfast, lunch, dinner, snack}, workout}.
- Meals must be specific (with portions).
- Respect diet restrictions and avoid forbidden items.
- Keep meals <90 chars, workout <60 chars.

OUTPUT JSON ONLY:
{
  "days": [
    {
      "label": "Day 1 • ${phase.name}",
      "meals": { "breakfast": "", "lunch": "", "dinner": "", "snack": "" },
      "workout": ""
    }
  ],
  "grocery": ["item1","item2"]
}
  `.trim();
}

  async function fetchAIPlan(days = 1) {
    setAiBusy(true);
    setAiError("");
    try {
      const messages = [
        { role: "system", content: "You are a licensed diet & fitness coach. Output STRICT JSON only." },
        { role: "user", content: buildPrimaryPrompt(days) },
      ];
      const plan = await providerCall(messages);
      return plan;
    } catch (e) {
      setAiError(humanizeProviderError(e?.message || String(e)));
      return null;
    } finally {
      setAiBusy(false);
    }
  }
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

USER PROFILE:
${JSON.stringify(profile)}

RULES:
- Specific dish with portions, ≤90 chars.
- Respect diet and avoid forbidden items.
- ${profile.has_pcos ? "STRICT PCOS RULES apply (low-GI carbs, no sugar/fried)." : ""}

Return STRICT JSON:
{"new_meal": "string"}
`.trim()
      }
    ];
    const out = await providerCall(messages);
    return out?.new_meal || "";
  } catch (e) {
    setAiError(humanizeProviderError(e?.message || String(e)));
    return null;
  } finally {
    setAiBusy(false);
  }
}

async function swapTodayMeal(dayIndex, mealKey) {
  if (!todayPlan) return;
  const d = todayPlan.days[dayIndex];
  const newMeal = await fetchAlternative(mealKey, d.meals[mealKey], d.label);
  if (!newMeal) return;
  const updated = JSON.parse(JSON.stringify(todayPlan));
  updated.days[dayIndex].meals[mealKey] = newMeal;
  setTodayPlan(updated);
}

async function swapWeekMeal(dayIndex, mealKey) {
  if (!weekPlan) return;
  const d = weekPlan.days[dayIndex];
  const newMeal = await fetchAlternative(mealKey, d.meals[mealKey], d.label);
  if (!newMeal) return;
  const updated = JSON.parse(JSON.stringify(weekPlan));
  updated.days[dayIndex].meals[mealKey] = newMeal;
  setWeekPlan(updated);
}

  async function generateToday() {
    const plan = await fetchAIPlan(1);
    setTodayPlan(plan);
  }
  async function generateWeek() {
    const plan = await fetchAIPlan(daysCount);
    setWeekPlan(plan);
  }

  /* ---------- Logout ---------- */
  async function logout() {
    await supabase.auth.signOut();
  }

  /* ---------- Dashboard ---------- */
const Dashboard = () => {
  const daysSinceLP = phase.daysSince ?? daysSince(profile.last_period);
  const delayDays =
    daysSinceLP != null && profile.cycle_length
      ? Math.max(0, daysSinceLP - Number(profile.cycle_length))
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        {/* Current Phase */}
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="text-pink-600" />
            <h2 className="text-xl font-semibold">Current Phase</h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full text-sm">
              {phase.name}
            </span>
            <span className="text-sm text-slate-700">
              Day {phase.dayInCycle || "—"} of cycle
            </span>
          </div>
          {daysSinceLP != null && (
            <p className="text-xs text-slate-600 mt-2">
              Last period was <strong>{daysSinceLP}</strong> day(s) ago.
              {delayDays > 0 && <> Possible delay ~{delayDays} day(s).</>}
            </p>
          )}
        </div>

        {/* About Phase */}
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-2">About {phase.name}</h2>
          <p className="text-sm text-slate-700">
            {PHASE_DETAILS[phase.name] || "Your cycle phase details will appear here."}
          </p>
        </div>

        {/* Profile Editor */}
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <h2 className="text-xl font-semibold">Your Profile</h2>
          <div className="mt-3 space-y-4 text-sm">
            <label className="block">
              Goal:
              <select
                className="mt-1 w-full p-2 border rounded-lg"
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
              >
                <option value="energy">Boost Energy</option>
                <option value="fat_loss">Fat Loss</option>
                <option value="strength">Strength</option>
                <option value="symptom_relief">Symptom Relief</option>
              </select>
            </label>

            <label className="block">
              Diet:
              <select
                className="mt-1 w-full p-2 border rounded-lg"
                value={profile.diet}
                onChange={(e) => setProfile({ ...profile, diet: e.target.value })}
              >
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="eggs_ok">Vegetarian + Eggs</option>
                <option value="nonveg">Non-Vegetarian</option>
              </select>
            </label>

            <label className="block">
              Cycle length:
              <select
                className="mt-1 w-full p-2 border rounded-lg"
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

            <label className="block">
              Last period:
              <DatePicker
                selected={isoToLocalDate(profile.last_period)}
                onChange={(date) => setProfile({ ...profile, last_period: localDateToISO(date) })}
                maxDate={new Date()}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                dateFormat="yyyy-MM-dd"
                placeholderText="Select"
                className="mt-1 w-full p-2 border rounded-lg"
              />
            </label>

            <TagInput
              label="Dislikes"
              values={profile.dislikes}
              onChange={(vals) => setProfile({ ...profile, dislikes: vals })}
              placeholder="e.g., paneer, chickpeas"
            />

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={profile.has_pcos}
                onChange={(e) => setProfile({ ...profile, has_pcos: e.target.checked })}
              /> PCOS-aware nutrition
            </label>
          </div>
        </div>
      </div>

      {/* Right column - Today’s AI Plan */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <Salad className="text-emerald-600 mb-2" />
          <h2 className="text-xl font-semibold">Today’s Plan (AI)</h2>
          {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
          <button
            className="w-full sm:w-auto px-4 py-3 mt-3 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
            disabled={aiBusy}
            onClick={generateToday}
          >
            {aiBusy ? "Thinking…" : "Generate Today’s Plan"}
          </button>

          {todayPlan && (
            <div className="mt-4 grid md:grid-cols-2 gap-4 text-slate-900">
              {todayPlan.days.map((d, i) => (
                <div key={i} className="p-3 rounded-lg border bg-slate-50">
                  <div className="font-semibold mb-2">{d.label}</div>
                  <ul className="text-sm ml-1 space-y-2">
                    {["breakfast", "lunch", "dinner", "snack"].map((k) => (
                      <li key={k} className="flex items-start gap-2">
                        <span className="font-semibold capitalize w-20">{k}:</span>
                        <span className="flex-1">{d.meals[k]}</span>
                        <button
                          title="Suggest another option"
                          className="w-full sm:w-auto px-2 py-1 text-xs rounded-md border bg-white hover:bg-slate-50"
                          onClick={() => swapTodayMeal(i, k)}
                        >
                          🔄 Suggest Another Option
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-sm">💪 {d.workout}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quotes & Jokes */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <Quote className="text-amber-600 mb-2" />
            <h2 className="text-xl font-semibold">Motivation of the Day</h2>
            <p className="italic text-slate-800">
              {
                [
                  "Small steps today, big changes tomorrow.",
                  "Your body is wise; listen gently.",
                  "Consistency beats intensity.",
                  "You’re doing better than you think.",
                ][phase.dayInCycle % 4 || 0]
              }
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm">
            <Laugh className="text-rose-600 mb-2" />
            <h2 className="text-xl font-semibold">Laugh Out Loud</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
};

<FeedbackForm user={user} />
  /* ---------- Planner ---------- */
const Planner = () => (
  <div className="max-w-6xl mx-auto px-5 pb-10 space-y-6">
    <div className="bg-white p-5 rounded-2xl shadow-sm">
      <h2 className="text-xl font-semibold">Weekly Planner</h2>
      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <label className="text-sm flex-1">
          Days:
          <select
            className="mt-1 w-full p-2 border rounded-lg"
            value={daysCount}
            onChange={(e) => setDaysCount(Number(e.target.value))}
          >
            {[3, 5, 7, 10, 14].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <button
          className="w-full sm:w-auto px-4 py-3 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
          disabled={aiBusy}
          onClick={generateWeek}
        >
          {aiBusy ? "Thinking…" : "Generate AI Plan"}
        </button>
        {weekPlan?.grocery?.length > 0 && (
          <button
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border bg-white"
            onClick={() => setShowGrocery(true)}
          >
            <ShoppingBasket className="w-4 h-4" /> Grocery List
          </button>
        )}
      </div>
      {aiError && <p className="text-xs text-red-600 mt-2">{aiError}</p>}
    </div>

    {weekPlan && (
      <div className="bg-white p-5 rounded-2xl shadow-sm">
        <h2 className="text-xl font-semibold">{daysCount}-Day Plan</h2>
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
                      className="w-full sm:w-auto px-2 py-1 text-xs rounded-md border bg-white hover:bg-slate-50"
                      onClick={() => swapTodayMeal(i, k)}
                    >
                      🔄 Suggest Another Option
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-sm">💪 {d.workout}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {showGrocery && (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-5 w-full max-w-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Grocery List</h3>
            <button onClick={() => setShowGrocery(false)}>Close</button>
          </div>
          <ul className="text-slate-900 list-disc ml-5 space-y-1">
            {weekPlan.grocery.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      </div>
    )}
  </div>
);

  /* ---------- TopBar ---------- */
  const TopBar = () => (
    <div className="max-w-6xl mx-auto px-5 pt-6 pb-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-pink-600" />
        <span className="text-2xl font-extrabold text-pink-700">PhaseFit</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => setView("dashboard")}>Dashboard</button>
        <button onClick={() => setView("planner")}>Planner</button>
        <button onClick={() => setView("feedback")}>Feedback</button>
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen text-slate-900 bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      <TopBar />
      {view === "dashboard" && <Dashboard />}
      {view === "planner" && <Planner />}
      {view === "feedback" && (
        <div className="max-w-6xl mx-auto px-5 pb-10 space-y-8">
          <FeedbackForm user={user} />
          <TestimonialsWall />
        </div>
      )}
    </div>
  );
}
