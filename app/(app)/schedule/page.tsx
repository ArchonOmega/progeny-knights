import Link from "next/link";
import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { fmtSLT, EVENT_KINDS } from "@/lib/format";
import { reportForDuty, standDown, cancelOccurrence } from "./actions";

export const dynamic = "force-dynamic";

type Occ = {
  id: string; starts_at: string; canceled: boolean;
  events: { title: string; kind: string; description: string | null; location: string | null; slurl: string | null };
  signups: { member_id: string; note: string | null; members: { callsign: string }; event_roles: { label: string } }[];
};

export default async function Schedule() {
  const s = await requireSession();
  const supabase = await supaServer();

  const [{ data: occs }, { data: roles }] = await Promise.all([
    supabase.from("occurrences")
      .select("id, starts_at, canceled, events(title, kind, description, location, slurl), signups(member_id, note, members(callsign), event_roles(label))")
      .gte("starts_at", new Date().toISOString())
      .eq("canceled", false)
      .order("starts_at").limit(20),
    supabase.from("event_roles").select("id, label").order("sort"),
  ]);

  const list = (occs ?? []) as unknown as Occ[];

  return (
    <>
      <div className="page-head">
        <h1>The Schedule</h1>
        {s.caps.has("schedule.manage") && <Link className="btn gold" href="/schedule/new">Decree an event</Link>}
      </div>
      <p className="sub muted">All times shown in SLT.</p>
      <Fleuron label="Duties of the Order" />

      {!list.length && <p className="empty">Nothing is decreed. Enjoy the stillness while it lasts.</p>}

      {list.map((o) => {
        const mine = o.signups.find((x) => x.member_id === s.userId);
        return (
          <div className="card" key={o.id}>
            <span className="tag-kind">{EVENT_KINDS[o.events.kind] ?? o.events.kind}</span>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
              <strong style={{ fontSize: "1.05rem" }}>{o.events.title}</strong>
              <span className="muted">{fmtSLT(o.starts_at)}</span>
            </div>
            {o.events.location && (
              <div className="small muted">
                {o.events.slurl ? <a href={o.events.slurl}>{o.events.location}</a> : o.events.location}
              </div>
            )}
            {o.events.description && <p className="small" style={{ margin: ".4rem 0" }}>{o.events.description}</p>}

            {o.signups.length > 0 && (
              <p className="small" style={{ margin: ".5rem 0" }}>
                <span className="muted">Standing duty: </span>
                {o.signups.map((x, i) => (
                  <span key={x.member_id}>
                    {i > 0 && ", "}
                    {x.members.callsign} <span className="muted">({x.event_roles.label})</span>
                  </span>
                ))}
              </p>
            )}

            {s.caps.has("schedule.signup") && (
              mine ? (
                <form action={standDown} className="row">
                  <input type="hidden" name="occurrence_id" value={o.id} />
                  <span className="small tight" style={{ color: "var(--gold)" }}>
                    You stand as {o.signups.find((x) => x.member_id === s.userId)?.event_roles.label}.
                  </span>
                  <button className="btn small tight">Stand down</button>
                </form>
              ) : (
                <form action={reportForDuty} className="row">
                  <input type="hidden" name="occurrence_id" value={o.id} />
                  <select name="role_id" defaultValue="sb" className="tight" style={{ width: "auto" }} aria-label="Role">
                    {roles?.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <input type="text" name="note" placeholder="Note (optional)" style={{ maxWidth: 220 }} />
                  <button className="btn primary small tight">Report for duty</button>
                </form>
              )
            )}

            {s.caps.has("schedule.manage") && (
              <form action={cancelOccurrence} style={{ marginTop: ".5rem" }}>
                <input type="hidden" name="id" value={o.id} />
                <button className="btn small">Cancel this occurrence</button>
              </form>
            )}
          </div>
        );
      })}
    </>
  );
}
