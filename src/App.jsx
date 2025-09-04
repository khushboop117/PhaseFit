import React, { useEffect, useState } from "react";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import SignupPage from "./SignUpPage";
import MainApp from "./MainApp";
import { supabase } from "./supabaseClient"; // make sure you have this

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("landing"); // "login" | "signup"

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));

    // Listen for login/logout changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription?.subscription.unsubscribe();
  }, []);

useEffect(() => {
    if (user) setAuthView("main");
  }, [user]);

  // Render
  if (authView === "landing") {
    return (
      <LandingPage
        onLogin={() => setAuthView("login")}
        onSignup={() => setAuthView("signup")}
      />
    );
  }

  if (authView === "login") {
    return <LoginPage switchToSignup={() => setAuthView("signup")} />;
  }

  if (authView === "signup") {
    return <SignupPage switchToLogin={() => setAuthView("login")} />;
  }

  if (authView === "main" && user) {
    return <MainApp user={user} />;
  }

  return null; // fallback
}