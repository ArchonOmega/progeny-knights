import { supaAdmin } from "@/lib/supabase/admin";
import { timingSafeEqual } from "crypto";

/** Authenticate an in-world node by its id + secret headers. */
export async function authNode(req: Request) {
  const id = req.headers.get("x-pk-node");
  const secret = req.headers.get("x-pk-secret");
  if (!id || !secret) return null;

  const admin = supaAdmin();
  const { data: node } = await admin.from("nodes").select("*").eq("id", id).single();
  if (!node) return null;

  const a = Buffer.from(node.secret);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // Optional pin: reject if the request comes from a different prim
  const objKey = req.headers.get("x-secondlife-object-key");
  if (node.object_key && objKey && node.object_key !== objKey.toLowerCase()) return null;

  await admin.from("nodes").update({ last_seen: new Date().toISOString() }).eq("id", id);
  return { node, admin };
}

export const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
