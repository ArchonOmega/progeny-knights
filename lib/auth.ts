import { supaServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Session = {
  userId: string;
  callsign: string;
  rank: string;
  rankTitle: string;
  caps: Set<string>;
};

export async function getSession(): Promise<Session | null> {
  const supabase = await supaServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: member }, { data: caps }] = await Promise.all([
    supabase.from("members").select("callsign, rank, ranks(title)").eq("id", user.id).single(),
    supabase.rpc("my_caps"),
  ]);
  if (!member) return null;

  const rankRow = member.ranks as unknown as { title: string } | null;
  return {
    userId: user.id,
    callsign: member.callsign,
    rank: member.rank,
    rankTitle: rankRow?.title ?? member.rank,
    caps: new Set<string>((caps as string[]) ?? []),
  };
}

export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
