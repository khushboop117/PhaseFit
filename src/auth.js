import { supabase } from "./supabaseClient"; 

// Sign up user
export async function login(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password});
  if (error) throw error;
}

export async function signUp(email, password, fullName) {
  const { error } = await supabase.auth.signUp({ email, password,  options: {
    data: { fullName }, // goes into auth.users.user_metadata
  },});
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}