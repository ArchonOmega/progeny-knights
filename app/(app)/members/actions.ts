"use server";
import { supaServer } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function setRank(formData: FormData) {
  const s = await requireSession();
  const supabase = await supaServer();
  const target = String(formData.get("member_id"));
  const rank = String(formData.get("rank"));
  await supabase.from("members").update({ rank }).eq("id", target);
  await supabase.rpc("log_action", {
    p_actor: s.userId, p_action: "member.rank", p_entity: "member",
    p_entity_id: target, p_detail: { rank },
  });
  revalidatePath("/members");
}

export async function setCap(formData: FormData) {
  const supabase = await supaServer();
  const member_id = String(formData.get("member_id"));
  const cap = String(formData.get("cap"));
  const mode = String(formData.get("mode")); // grant | revoke | clear
  if (mode === "clear") {
    await supabase.from("member_capabilities").delete().eq("member_id", member_id).eq("cap", cap);
  } else {
    await supabase.from("member_capabilities").upsert({ member_id, cap, granted: mode === "grant" });
  }
  revalidatePath("/members");
}
