import React, { useState } from "react";
import { supabase } from "./supabaseClient"; 

export default function FeedbackForm({ user, onSubmitted }) {
  const fullName = user?.user_metadata?.fullName || "Anonymous";
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { error } = await supabase.from("feedback").insert({
      user_id: user?.id || null, // 👈 link to Supabase auth user
      user_email: user?.email || null, // 👈 save email
      fullName: user?.user_metadata?.fullName || "Anonymous", // 👈 save name
        rating,
        message,
      });
      if (error) throw error;
      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      // setError(err.message);
    }
  }

  if (submitted) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
        ✅ Thanks for your feedback!
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white rounded-2xl shadow-sm space-y-4"
    >
      <h2 className="text-xl font-semibold">We’d love your feedback ✨</h2>

      {/* Rating */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            onClick={() => setRating(star)}
            className={`w-10 h-10 rounded-full border flex items-center justify-center text-lg ${
              star <= rating
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-slate-500 border-slate-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share your thoughts…"
        rows={4}
        className="w-full p-3 border rounded-lg"
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        className="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
      >
        Submit Feedback
      </button>
    </form>
  );
}
