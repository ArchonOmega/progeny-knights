import Link from "next/link";
import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { fmtSLT, EVENT_KINDS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const s = await requireSession();
  const supabase = await supaServer();

  const [{ data: occs }, { data: docs }] = await Promise.all([
    supabase
      .from("occurrences")
      .select("id, starts_at, canceled, events(title, kind), signups(member_id)")
      .gte("starts_at", new Date().toISOString())
      .eq("canceled", false)
      .order("starts_at")
      .limit(4),
    supabase
      .from("documents")
      .select("id, title, author_name, source, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Los_Angeles" })
      .format(new Date())
  );
  const greeting = hour < 6 || hour >= 20 ? "The night is yours" : hour < 12 ? "The sun rises" : "Dusk approaches";

  return (
    <>
      <div className="page-head">
        <h1>{greeting}, {s.callsign}</h1>
      </div>
      <Fleuron label="The Hall" />

      <h2>Upcoming duties</h2>
      {!occs?.length && <div className="card"><p className="empty">The schedule is quiet. Peace, for now.</p></div>}
      {occs?.map((o) => {
        const ev = o.events as unknown as { title: string; kind: string };
        const count = (o.signups as unknown as unknown[])?.length ?? 0;
        return (
          <Link key={o.id} href="/schedule" style={{ color: "inherit" }}>
            <div className="card hover">
              <span className="tag-kind">{EVENT_KINDS[ev.kind] ?? ev.kind}</span>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".4rem" }}>
                <strong>{ev.title}</strong>
                <span className="muted">{fmtSLT(o.starts_at)}</span>
              </div>
              <span className="small muted">{count} {count === 1 ? "knight has" : "knights have"} reported for duty</span>
            </div>
          </Link>
        );
      })}

      <h2>Latest filings</h2>
      {!docs?.length && <div className="card"><p className="empty">The archive awaits its first report.</p></div>}
      {docs?.map((d) => (
        <Link key={d.id} href={`/archive/${d.id}`} style={{ color: "inherit" }}>
          <div className="card hover" style={{ display: "flex", justifyContent: "space-between", gap: ".6rem", flexWrap: "wrap" }}>
            <span>{d.title}</span>
            <span className="small muted">
              {d.author_name} {d.source === "inworld" && <span className="badge gold">in-world</span>}
            </span>
          </div>
        </Link>
      ))}

      <div className="gap" />
      <div className="row">
        <Link className="btn gold tight" href="/archive/new">File a report</Link>
        <Link className="btn tight" href="/schedule">Report for duty</Link>
      </div>
    </>
  );
}
