import Link from "next/link";
import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { createPage } from "./actions";

export const dynamic = "force-dynamic";

const SECTIONS: [string, string, string][] = [
  ["guide", "The Guide", "The path from first night to knighting. Read in order."],
  ["knowledge", "Knowledge Base", "Quick answers for the working knight."],
  ["wiki", "Chronicles", "Lore, records, and everything else worth keeping."],
];

export default async function Wiki({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const s = await requireSession();
  const { e } = await searchParams;
  const supabase = await supaServer();
  const { data: pages } = await supabase
    .from("wiki_pages").select("slug, section, title, sort").order("sort").order("title");

  return (
    <>
      <div className="page-head"><h1>The Codex</h1></div>
      <Fleuron label="What every knight must know" />
      {e && <div className="card" style={{ borderColor: "var(--blood)" }}>{e}</div>}

      {SECTIONS.map(([key, label, blurb]) => (
        <section key={key}>
          <h2>{label}</h2>
          <p className="small muted" style={{ marginTop: "-.3rem" }}>{blurb}</p>
          <div className="card">
            {pages?.filter((p) => p.section === key).map((p) => (
              <div key={p.slug} style={{ padding: ".22rem 0" }}>
                <Link href={`/wiki/${p.slug}`}>{p.title}</Link>
              </div>
            ))}
            {!pages?.some((p) => p.section === key) && <span className="muted small">Nothing written yet.</span>}
          </div>
        </section>
      ))}

      {s.caps.has("wiki.edit") && (
        <>
          <h2>Add a page</h2>
          <form action={createPage} className="row card">
            <label className="fld"><span>Title</span><input name="title" type="text" required maxLength={80} /></label>
            <label className="fld tight"><span>Section</span>
              <select name="section" defaultValue="wiki">
                <option value="guide">Guide</option><option value="knowledge">Knowledge Base</option><option value="wiki">Chronicles</option>
              </select>
            </label>
            <button className="btn gold tight">Create</button>
          </form>
        </>
      )}
    </>
  );
}
