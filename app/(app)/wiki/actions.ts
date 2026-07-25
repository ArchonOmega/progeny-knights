"use server";
import { supaServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function savePage(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();
  const slug = String(formData.get("slug"));
  await supabase.from("wiki_pages")
    .update({ body: String(formData.get("body") || ""), title: String(formData.get("title")), updated_by: s.userId })
    .eq("slug", slug);
  redirect("/wiki/" + slug);
}

export async function createPage(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();
  const title = String(formData.get("title")).trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "page";
  const { error } = await supabase.from("wiki_pages").insert({
    slug, title, section: String(formData.get("section") || "wiki"), body: `# ${title}\n\n`, updated_by: s.userId,
  });
  if (error) redirect("/wiki?e=" + encodeURIComponent(error.message));
  redirect(`/wiki/${slug}?edit=1`);
}
