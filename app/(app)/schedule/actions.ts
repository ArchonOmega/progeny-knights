"use server";
import { supaServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function reportForDuty(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();
  await supabase.from("signups").upsert({
    occurrence_id: String(formData.get("occurrence_id")),
    member_id: s.userId,
    role_id: String(formData.get("role_id") || "sb"),
    note: String(formData.get("note") || "") || null,
  });
  revalidatePath("/schedule");
}

export async function standDown(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();
  await supabase.from("signups").delete()
    .eq("occurrence_id", String(formData.get("occurrence_id")))
    .eq("member_id", s.userId);
  revalidatePath("/schedule");
}

export async function createEvent(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();

  const freq = String(formData.get("recur_freq") || "");
  const bydayRaw = formData.getAll("byday").map(Number);
  const weekRaw = String(formData.get("recur_week") || "");

  const { error } = await supabase.from("events").insert({
    title: String(formData.get("title")),
    kind: String(formData.get("kind") || "other"),
    description: String(formData.get("description") || "") || null,
    location: String(formData.get("location") || "") || null,
    slurl: String(formData.get("slurl") || "") || null,
    starts_at: new Date(String(formData.get("starts_at"))).toISOString(),
    duration_mins: Number(formData.get("duration_mins") || 120),
    recur_freq: freq || null,
    recur_interval: Number(formData.get("recur_interval") || 1),
    recur_byday: freq && bydayRaw.length ? bydayRaw : null,
    recur_week: freq === "monthly" && weekRaw !== "" ? Number(weekRaw) : null,
    recur_until: String(formData.get("recur_until") || "") || null,
    created_by: s.userId,
  });
  if (error) redirect("/schedule/new?e=" + encodeURIComponent(error.message));
  redirect("/schedule");
}

export async function cancelOccurrence(formData: FormData) {
  const supabase = await supaServer();
  await supabase.from("occurrences").update({ canceled: true })
    .eq("id", String(formData.get("id")));
  revalidatePath("/schedule");
}
