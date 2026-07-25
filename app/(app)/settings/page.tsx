import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { makeLinkCode, createNode, deleteNode } from "./actions";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const s = await requireSession();
  const supabase = await supaServer();

  const [{ data: me }, { data: code }, { data: nodes }] = await Promise.all([
    supabase.from("members").select("avatar_key, sl_username").eq("id", s.userId).single(),
    supabase.from("link_codes").select("code, expires_at, used_at").eq("member_id", s.userId).maybeSingle(),
    s.caps.has("nodes.manage")
      ? supabase.from("nodes").select("id, name, region, secret, last_seen").order("name")
      : Promise.resolve({ data: null }),
  ]);

  const codeLive = code && !code.used_at && new Date(code.expires_at) > new Date();

  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>
      <Fleuron />

      <h2>Link your avatar</h2>
      <div className="card">
        {me?.avatar_key ? (
          <p>
            Your avatar <strong style={{ color: "var(--gold)" }}>{me.sl_username ?? "…"}</strong> is bound to this account.
            In-world filings will be credited to you. Generate a new code to re-link a different avatar.
          </p>
        ) : (
          <p>Bind your Second Life avatar so notecards you drop at any Archive Node are credited to you.</p>
        )}
        {codeLive ? (
          <>
            <div className="linkcode">{code!.code}</div>
            <p className="small muted">
              Stand near any Archive Node in-world and say <span className="mono">/77 link {code!.code}</span> within
              ten minutes. The node will confirm the binding.
            </p>
          </>
        ) : (
          <form action={makeLinkCode}><button className="btn gold">Generate link code</button></form>
        )}
      </div>

      {s.caps.has("nodes.manage") && (
        <>
          <h2>In-world nodes</h2>
          <div className="card">
            <p className="small muted">
              Each node is one scripted prim. Paste its ID and secret into the LSL script&apos;s configuration block.
            </p>
            {nodes?.map((n) => (
              <div key={n.id} style={{ borderTop: "1px solid var(--stone)", padding: ".7rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                  <strong>{n.name}</strong>
                  <span className="small muted">
                    {n.region ?? "region unset"} · {n.last_seen ? "last seen " + new Date(n.last_seen).toLocaleString() : "never seen"}
                  </span>
                </div>
                <div className="small mono muted" style={{ wordBreak: "break-all" }}>
                  NODE_ID = &quot;{n.id}&quot;<br />NODE_SECRET = &quot;{n.secret}&quot;
                </div>
                <form action={deleteNode} style={{ marginTop: ".4rem" }}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="btn small">Decommission</button>
                </form>
              </div>
            ))}
            <form action={createNode} className="row" style={{ marginTop: "1rem" }}>
              <label className="fld"><span>Node name</span><input name="name" type="text" required placeholder="Keep Gatehouse Node" /></label>
              <label className="fld"><span>Region</span><input name="region" type="text" placeholder="Crimson Keep" /></label>
              <button className="btn gold tight">Forge node</button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
