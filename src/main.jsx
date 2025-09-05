
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";

// 👇 Call it once, outside ReactDOM.createRoot
// registerSW({
//   onNeedRefresh() {
//     console.log("New content available, refresh to update.");
//   },
//   onOfflineReady() {
//     console.log("App ready to work offline.");
//   },
// });
registerSW();
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


const TopBar = () => (
  <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2">
      <Sparkles className="w-6 h-6 text-pink-600" />
      <span className="text-lg sm:text-2xl font-extrabold text-pink-700">
        PhaseFit
      </span>
    </div>

    {/* Navigation */}
    <div className="hidden sm:flex items-center gap-3 text-sm">
      <button
        onClick={() => setView("dashboard")}
        className={`px-3 py-1.5 rounded-lg ${
          view === "dashboard"
            ? "bg-pink-100 text-pink-700 border border-pink-200"
            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        Dashboard
      </button>
      <button
        onClick={() => setView("planner")}
        className={`px-3 py-1.5 rounded-lg ${
          view === "planner"
            ? "bg-pink-100 text-pink-700 border border-pink-200"
            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        }`}
      >
        Planner
      </button>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.reload();
        }}
        className="px-3 py-1.5 rounded-lg border bg-white text-slate-800 hover:bg-slate-50"
      >
        <LogOut className="w-4 h-4 inline" /> Logout
      </button>
    </div>

    {/* Mobile menu */}
    <div className="sm:hidden">
      <select
        value={view}
        onChange={(e) => setView(e.target.value)}
        className="p-2 border rounded-lg bg-white text-slate-700"
      >
        <option value="dashboard">Dashboard</option>
        <option value="planner">Planner</option>
        <option value="logout">Logout</option>
      </select>
    </div>
  </div>
);
