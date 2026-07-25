import Link from "next/link";
import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { fmtDateMDY, DOC_TYPES } from "@/lib/format";

export const dynamic = "force-dynamic";

const SORTS: Record<string, string> = {
  date: "report_date", title: "title", reporter: "author_name", type: "doc_type", filed: "created_at",
};

export default async function Archive({
  searchParams,
}: { searchParams: Promise<{ q?: string; sort?: string; dir?: string; type?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const sortKey = SORTS[sp.sort ?? ""] ? sp.sort! : "date";
  const asc = sp.dir === "asc";
  const supabase = await supaServer();

  let q = supabase
    .from("documents")
    .select("id, title, doc_type, report_date, author_name, source, created_at")
    .order(SORTS[sortKey], { ascending: asc })
    .limit(200);
  if (sp.type && DOC_TYPES[sp.type]) q = q.eq("doc_type", sp.type);
  if (sp.q) q = q.textSearch("fts", sp.q, { type: "websearch" });

  const { data: docs } = await q;

  const th = (key: string, label: string) => {
    const on = sortKey === key;
    const dir = on && !asc ? "asc" : "desc";
    const params = new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.type && { type: sp.type }), sort: key, dir });
    return (
      <th><a className={on ? "on" : ""} href={`/archive?${params}`}>{label}{on ? (asc ? " ▲" : " ▼") : ""}</a></th>
    );
  };

  return (
    <>
      <div className="page-head">
        <h1>The Archive</h1>
        {s.caps.has("docs.upload") && <Link className="btn gold" href="/archive/new">File a report</Link>}
      </div>
      <Fleuron label="Records of the Order" />

      <form className="row" method="get" style={{ marginBottom: "1.2rem" }}>
        <input type="search" name="q" placeholder="Search titles and text…" defaultValue={sp.q ?? ""} />
        <select name="type" defaultValue={sp.type ?? ""} className="tight" style={{ width: "auto" }}>
          <option value="">All types</option>
          {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn tight">Search</button>
      </form>

      {!docs?.length ? (
        <p className="empty">No records match. The night keeps its secrets.</p>
      ) : (
        <table className="ledger">
          <thead><tr>{th("date", "Date")}{th("title", "Title")}{th("type", "Type")}{th("reporter", "Reporter")}<th>Source</th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td className="muted">{fmtDateMDY(d.report_date)}</td>
                <td><Link href={`/archive/${d.id}`}>{d.title}</Link></td>
                <td><span className="badge">{DOC_TYPES[d.doc_type]}</span></td>
                <td>{d.author_name}</td>
                <td>{d.source === "inworld" ? <span className="badge gold">in-world</span> : <span className="badge">web</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
