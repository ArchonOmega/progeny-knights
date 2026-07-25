import { authNode, text } from "@/lib/sl";
import { NextRequest } from "next/server";

/** POST { code, avatar, avatar_name, username } — binds an avatar to the member who made the code. */
export async function POST(req: NextRequest) {
  const auth = await authNode(req);
  if (!auth) return text("DENIED", 401);

  let p: { code?: string; avatar?: string; avatar_name?: string; username?: string };
  try { p = await req.json(); } catch { return text("BAD JSON", 400); }
  if (!p.code || !p.avatar) return text("MISSING FIELDS", 400);

  const { admin } = auth;
  const { data: lc } = await admin.from("link_codes").select("*").eq("code", p.code).maybeSingle();
  if (!lc || lc.used_at || new Date(lc.expires_at) < new Date()) return text("CODE INVALID OR EXPIRED");

  // one avatar → one account
  await admin.from("members").update({ avatar_key: null }).eq("avatar_key", p.avatar);
  const { error } = await admin.from("members")
    .update({ avatar_key: p.avatar, sl_username: p.username ?? p.avatar_name ?? null })
    .eq("id", lc.member_id);
  if (error) return text("LINK ERROR", 500);

  await admin.from("link_codes").update({ used_at: new Date().toISOString() }).eq("code", p.code);
  const { data: m } = await admin.from("members").select("callsign").eq("id", lc.member_id).single();
  return text(`LINKED|${m?.callsign ?? "knight"}`);
}
