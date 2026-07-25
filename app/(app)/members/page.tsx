import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { setRank, setCap, setTitle } from "./actions";

export const dynamic = "force-dynamic";

export default async function Roster() {
  const s = await requireSession();
  const canManage = s.caps.has("members.manage");
  const supabase = await supaServer();

  const [{ data: members }, { data: ranks }, { data: caps }, { data: overrides }] = await Promise.all([
    supabase.from("members").select("id, callsign, sl_username, avatar_key, rank, title, active, joined_at, ranks(title, sort)").order("callsign"),
    supabase.from("ranks").select("id, title, sort").order("sort"),
    supabase.from("capabilities").select("id, label"),
    canManage ? supabase.from("member_capabilities").select("member_id, cap, granted") : Promise.resolve({ data: [] as { member_id: string; cap: string; granted: boolean }[] }),
  ]);

  const sorted = (members ?? []).slice().sort((a, b) => {
    const ra = (a.ranks as unknown as { sort: number })?.sort ?? 99;
    const rb = (b.ranks as unknown as { sort: number })?.sort ?? 99;
    return ra - rb || a.callsign.localeCompare(b.callsign);
  });

  return (
    <>
      <div className="page-head"><h1>The Roster</h1></div>
      <Fleuron label="Blades of the Order" />

      <table className="ledger">
        <thead><tr><th>Callsign</th><th>Rank</th><th>Avatar</th>{canManage && <th>Overrides</th>}</tr></thead>
        <tbody>
          {sorted.map((m) => {
            const rank = m.ranks as unknown as { title: string };
            const mine = (overrides ?? []).filter((o) => o.member_id === m.id);
            return (
              <tr key={m.id}>
                <td>
                  {m.callsign} {m.title && <span className="badge gold">{m.title}</span>} {!m.active && <span className="badge">inactive</span>}
                  {m.sl_username && <div className="small muted">{m.sl_username}</div>}
                </td>
                <td>
                  {canManage && m.id !== s.userId ? (
                    <form action={setRank} className="row" style={{ gap: ".4rem" }}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <select name="rank" defaultValue={m.rank} className="tight" style={{ width: "auto" }}>
                        {ranks?.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                      <button className="btn small tight">Set</button>
                    </form>
                  ) : (
                    <span className="badge gold">{rank?.title ?? m.rank}</span>
                  )}
                </td>
                <td>{m.avatar_key ? <span className="badge gold">linked</span> : <span className="badge">not linked</span>}</td>
                {canManage && (
                  <td>
                    {mine.map((o) => (
                      <form key={o.cap} action={setCap} style={{ display: "inline-block", marginRight: ".4rem" }}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <input type="hidden" name="cap" value={o.cap} />
                        <input type="hidden" name="mode" value="clear" />
                        <button className={"badge " + (o.granted ? "gold" : "blood")} title="Click to clear override" style={{ cursor: "pointer", background: "none" }}>
                          {o.granted ? "+" : "−"} {o.cap} ✕
                        </button>
                      </form>
                    ))}
                    <details>
                      <summary className="small muted" style={{ cursor: "pointer" }}>adjust…</summary>
                      <form action={setCap} className="row" style={{ marginTop: ".4rem", gap: ".4rem" }}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <select name="cap" className="tight" style={{ width: "auto" }}>
                          {caps?.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <select name="mode" className="tight" style={{ width: "auto" }}>
                          <option value="grant">Grant</option><option value="revoke">Revoke</option>
                        </select>
                        <button className="btn small tight">Apply</button>
                      </form>
                      <form action={setTitle} className="row" style={{ marginTop: ".4rem", gap: ".4rem" }}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <input type="text" name="title" defaultValue={m.title ?? ""} maxLength={30}
                          placeholder="Honorific title" style={{ maxWidth: 180 }} />
                        <button className="btn small tight">Set title</button>
                      </form>
                    </details>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {canManage && (
        <p className="small muted" style={{ marginTop: "1rem" }}>
          Overrides sit atop rank defaults: <span className="badge gold">+ grant</span> adds a right the rank lacks,{" "}
          <span className="badge blood">− revoke</span> removes one it has. Click an override to clear it.
        </p>
      )}
    </>
  );
}
