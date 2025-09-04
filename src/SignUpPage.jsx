import React, { useState } from "react";
import { signUp } from "./auth";
import AuthCard from "./AuthCard";

export default function SignupPage({ switchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    try {
      await signUp(email, password); // supabase.auth.signUp under the hood
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      footer={
        <>
          Already have an account?{" "}
          <button className="text-pink-600 hover:underline" onClick={switchToLogin}>
            Log in
          </button>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 border rounded-lg"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Sign Up
        </button>
      </form>
    </AuthCard>
  );
}