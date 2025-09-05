import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function TestimonialsWall() {
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    fetchFeedback();
  }, []);

  async function fetchFeedback() {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, fullName, rating, message, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setFeedback(data);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">What People Are Saying 💬</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {feedback.map((f) => (
          <div
            key={f.id}
            className="bg-white p-5 rounded-2xl shadow-sm border space-y-2"
          >
            {/* Avatar from email */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center font-bold text-pink-700">
                {f.fullName?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-semibold">{f.fullName}</p>

              </div>
            </div>

            {/* Rating */}
            <div className="flex text-yellow-500 text-lg">
              {"★".repeat(f.rating)}
              {"☆".repeat(5 - f.rating)}
            </div>

            {/* Message */}
            <p className="text-slate-700 text-sm">{f.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
