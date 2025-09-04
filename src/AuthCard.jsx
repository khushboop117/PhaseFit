import React from "react";

export default function AuthCard({ title, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-pink-700 mb-6">{title}</h2>
        {children}
        <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>
      </div>
    </div>
  );
}
