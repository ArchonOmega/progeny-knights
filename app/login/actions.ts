"use server";
import { supaServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const supabase = await supaServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect("/login?e=" + encodeURIComponent(error.message));
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await supaServer();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: { data: { callsign: String(formData.get("callsign") || "").trim() } },
  });
  if (error) redirect("/login?e=" + encodeURIComponent(error.message) + "&m=join");
  redirect("/login?e=" + encodeURIComponent("Petition received. If email confirmation is on, check your inbox — then sign in."));
}

export async function signOut() {
  const supabase = await supaServer();
  await supabase.auth.signOut();
  redirect("/login");
}
