"use server";
import { supaServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { docTitle } from "@/lib/format";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDocument(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();

  const doc_type = String(formData.get("doc_type") || "duty_report");
  const report_date = String(formData.get("report_date"));
  const custom = String(formData.get("title") || "").trim();
  const title = doc_type === "duty_report" || !custom ? docTitle(doc_type, report_date) : custom;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      title, doc_type, report_date,
      body: String(formData.get("body") || ""),
      author_id: s.userId, author_name: s.callsign, source: "web",
    })
    .select("id").single();

  if (error) redirect("/archive/new?e=" + encodeURIComponent(error.message));
  redirect("/archive/" + data.id);
}

export async function deleteDocument(formData: FormData) {
  const supabase = await supaServer();
  await supabase.from("documents").delete().eq("id", String(formData.get("id")));
  revalidatePath("/archive");
  redirect("/archive");
}
