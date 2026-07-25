"use server";
import { supaServer } from "@/lib/supabase/server";
import { normalizeSlUsername, slEmail } from "@/lib/slname";
import { redirect } from "next/navigation";

function friendly(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "No knight answers to that name and password.";
  if (/already registered/i.test(msg)) return "That Second Life name is already sworn to an account. Sign in instead.";
  if (/password/i.test(msg)) return msg;
  return msg;
}

export async function signIn(formData: FormData) {
  const username = normalizeSlUsername(String(formData.get("username") || ""));
  if (username.length < 2) redirect("/login?e=" + encodeURIComponent("Enter your Second Life username."));

  const supabase = await supaServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: slEmail(username),
    password: String(formData.get("password")),
  });
  if (error) redirect("/login?e=" + encodeURIComponent(friendly(error.message)));
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const rawName = String(formData.get("username") || "").trim();
  const username = normalizeSlUsername(rawName);
  if (username.length < 2) redirect("/login?e=" + encodeURIComponent("Enter your Second Life username.") + "&m=join");

  const callsign = String(formData.get("callsign") || "").trim() || rawName;

  const supabase = await supaServer();
  const { error } = await supabase.auth.signUp({
    email: slEmail(username),
    password: String(formData.get("password")),
    options: { data: { callsign, sl_username: username } },
  });
  if (error) redirect("/login?e=" + encodeURIComponent(friendly(error.message)) + "&m=join");
  redirect("/login?e=" + encodeURIComponent("Petition received. Sign in with your Second Life name."));
}

export async function signOut() {
  const supabase = await supaServer();
  await supabase.auth.signOut();
  redirect("/login");
}
