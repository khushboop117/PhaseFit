import React, { use, useState } from "react";
import { signUp } from "./auth";
import AuthCard from "./AuthCard";

export default function SignupPage({ switchToLogin }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const successMessage = await signUp(email, password, fullName); // 👈
      setSuccess(successMessage); // 👈 show message
    } catch (err) {
     // setError(err.message);
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
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter Your Name"
            className="w-full px-4 py-2 border rounded-lg"
            required
          />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
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