import { authNode, text } from "@/lib/sl";
import { NextRequest } from "next/server";

/** POST { avatars: [{ key, name }] } — logs presence against the occurrence nearest to now (±3h). */
export async function POST(req: NextRequest) {
  const auth = await authNode(req);
  if (!auth) return text("DENIED", 401);

  let p: { avatars?: { key: string; name: string }[] };
  try { p = await req.json(); } catch { return text("BAD JSON", 400); }
  if (!p.avatars?.length) return text("OK 0");

  const { admin } = auth;
  const now = Date.now();
  const { data: occ } = await admin.from("occurrences")
    .select("id, starts_at")
    .gte("starts_at", new Date(now - 3 * 3600e3).toISOString())
    .lte("starts_at", new Date(now + 3 * 3600e3).toISOString())
    .eq("canceled", false)
    .order("starts_at").limit(1).maybeSingle();
  if (!occ) return text("NO EVENT WINDOW");

  const keys = p.avatars.map((a) => a.key);
  const { data: linked } = await admin.from("members").select("id, avatar_key").in("avatar_key", keys);
  const byKey = new Map((linked ?? []).map((m) => [m.avatar_key as string, m.id as string]));

  const nowIso = new Date().toISOString();
  for (const a of p.avatars.slice(0, 60)) {
    await admin.from("attendance").upsert(
      {
        occurrence_id: occ.id, avatar_key: a.key, avatar_name: a.name,
        member_id: byKey.get(a.key) ?? null, last_seen: nowIso,
      },
      { onConflict: "occurrence_id,avatar_key", ignoreDuplicates: false }
    );
  }
  return text(`OK ${p.avatars.length}`);
}
