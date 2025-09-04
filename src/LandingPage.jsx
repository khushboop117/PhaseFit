import React from "react";
import { Sparkles, Salad, Dumbbell, CalendarDays, Heart } from "lucide-react";

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-pink-600" />
          <h1 className="text-2xl font-extrabold text-pink-700">PhaseFit</h1>
        </div>
        <div className="space-x-3">
          <button
            onClick={onLogin}
            className="px-4 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
          >
            Log In
          </button>
          <button
            onClick={onSignup}
            className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 mt-20 space-y-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
          AI-powered nutrition & fitness <br /> tailored to your cycle ✨
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl">
          PhaseFit helps women optimize energy, strength, and wellness with personalized
          meal & workout plans that adapt to hormonal phases and PCOS needs.
        </p>

      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 px-6 mt-20 max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center space-y-3">
          <CalendarDays className="w-8 h-8 text-pink-600 mx-auto" />
          <h3 className="font-semibold text-lg">Cycle Tracking</h3>
          <p className="text-slate-600 text-sm">
            Plans that adapt to your menstrual phases: menstruation, follicular,
            ovulation, luteal.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center space-y-3">
          <Salad className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="font-semibold text-lg">Smart Nutrition</h3>
          <p className="text-slate-600 text-sm">
            Balanced meals built with AI — respecting your diet, allergies, and PCOS needs.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center space-y-3">
          <Dumbbell className="w-8 h-8 text-indigo-600 mx-auto" />
          <h3 className="font-semibold text-lg">Personalized Workouts</h3>
          <p className="text-slate-600 text-sm">
            Tailored exercise suggestions that sync with your energy levels and goals.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center space-y-3 md:col-span-3">
          <Heart className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-semibold text-lg">Made for Women</h3>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Unlike generic health apps, PhaseFit understands women’s unique hormonal rhythms
            and supports PCOS-friendly lifestyles.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto text-center py-6 text-xs text-slate-500">
        © {new Date().getFullYear()} PhaseFit • Built with ❤️ for women’s wellness
      </footer>
    </div>
  );
}
