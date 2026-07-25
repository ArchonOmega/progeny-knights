"use server";
import { supaServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { supaAdmin } from "@/lib/supabase/admin";
import { randomBytes, randomInt } from "crypto";
import { revalidatePath } from "next/cache";

export async function makeLinkCode() {
  const s = await requireSession();
  const supabase = await supaServer();
  const code = String(randomInt(100000, 999999));
  await supabase.from("link_codes").delete().eq("member_id", s.userId);
  await supabase.from("link_codes").insert({
    code, member_id: s.userId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  revalidatePath("/settings");
}

export async function createNode(formData: FormData) {
  const s = await requireSession();
  if (!s.caps.has("nodes.manage")) return;
  const admin = supaAdmin();
  await admin.from("nodes").insert({
    name: String(formData.get("name")),
    region: String(formData.get("region") || "") || null,
    secret: randomBytes(24).toString("hex"),
  });
  revalidatePath("/settings");
}

export async function deleteNode(formData: FormData) {
  const s = await requireSession();
  if (!s.caps.has("nodes.manage")) return;
  const admin = supaAdmin();
  await admin.from("nodes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/settings");
}
