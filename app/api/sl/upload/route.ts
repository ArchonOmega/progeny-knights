import { authNode, text } from "@/lib/sl";
import { NextRequest } from "next/server";

/**
 * Chunked notecard upload from an in-world node.
 * Body (JSON): { session, seq, total, name, avatar, avatar_name, data }
 * Chunks may arrive out of order; the document is filed when all are in.
 */
export async function POST(req: NextRequest) {
  const auth = await authNode(req);
  if (!auth) return text("DENIED", 401);
  const { node, admin } = auth;

  let p: { session?: string; seq?: number; total?: number; name?: string; avatar?: string; avatar_name?: string; data?: string };
  try { p = await req.json(); } catch { return text("BAD JSON", 400); }
  if (!p.session || !p.seq || !p.total || p.data === undefined) return text("MISSING FIELDS", 400);
  if (p.total > 64 || String(p.data).length > 8000) return text("TOO LARGE", 413);

  const sid = `${node.id}:${p.session}`;
  const { data: existing } = await admin.from("sl_upload_sessions").select("*").eq("id", sid).maybeSingle();

  const chunks = { ...((existing?.chunks as Record<string, string>) ?? {}), [String(p.seq)]: String(p.data) };
  await admin.from("sl_upload_sessions").upsert({
    id: sid, node_id: node.id, total: p.total, chunks,
    avatar_key: p.avatar ?? existing?.avatar_key,
    avatar_name: p.avatar_name ?? existing?.avatar_name,
    doc_title: p.name ?? existing?.doc_title,
  });

  if (Object.keys(chunks).length < p.total) return text(`OK ${Object.keys(chunks).length}/${p.total}`);

  // All chunks in — assemble and file
  const body = Array.from({ length: p.total }, (_, i) => chunks[String(i + 1)] ?? "").join("");
  const avatarKey = (p.avatar ?? existing?.avatar_key) as string | undefined;
  const avatarName = (p.avatar_name ?? existing?.avatar_name ?? "Unknown Knight") as string;
  const rawName = ((p.name ?? existing?.doc_title) as string | undefined)?.trim();

  const { data: member } = avatarKey
    ? await admin.from("members").select("id, callsign").eq("avatar_key", avatarKey).maybeSingle()
    : { data: null };

  const now = new Date();
  const mdy = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
  const isReport = !rawName || /duty|report/i.test(rawName);
  const title = isReport ? `Duty Report [${mdy}]` : rawName!;

  const { data: doc, error } = await admin.from("documents").insert({
    title,
    doc_type: isReport ? "duty_report" : "notecard",
    report_date: now.toISOString().slice(0, 10),
    body,
    author_id: member?.id ?? null,
    author_name: member?.callsign ?? avatarName,
    source: "inworld",
    node_id: node.id,
  }).select("id").single();

  await admin.from("sl_upload_sessions").delete().eq("id", sid);
  if (error) return text("FILE ERROR: " + error.message, 500);

  await admin.rpc("log_action", {
    p_actor: member?.id ?? null, p_action: "document.create", p_entity: "document",
    p_entity_id: doc.id, p_detail: { title, source: "inworld", node: node.name, avatar: avatarName },
  });
  return text(`FILED|${title}|${member ? member.callsign : avatarName + " (unlinked)"}`);
}
