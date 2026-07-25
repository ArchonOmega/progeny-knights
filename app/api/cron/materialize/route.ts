import { supaAdmin } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

/** Daily Vercel Cron: extend the occurrence horizon and sweep stale upload sessions & link codes. */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("DENIED", { status: 401 });
  }
  const admin = supaAdmin();
  const { data: made } = await admin.rpc("materialize_occurrences", { horizon_days: 90 });
  await admin.from("sl_upload_sessions").delete()
    .lt("created_at", new Date(Date.now() - 3600e3).toISOString());
  await admin.from("link_codes").delete()
    .lt("expires_at", new Date(Date.now() - 86400e3).toISOString());
  return Response.json({ ok: true, occurrences_created: made ?? 0 });
}
