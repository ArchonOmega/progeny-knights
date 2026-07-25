import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { fmtDateMDY, DOC_TYPES } from "@/lib/format";
import { deleteDocument } from "../actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DocView({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const supabase = await supaServer();
  const { data: d } = await supabase.from("documents").select("*").eq("id", id).single();
  if (!d) notFound();

  return (
    <>
      <div className="page-head">
        <h1>{d.title}</h1>
        {s.caps.has("docs.delete") && (
          <form action={deleteDocument}>
            <input type="hidden" name="id" value={d.id} />
            <button className="btn small">Strike from record</button>
          </form>
        )}
      </div>
      <p className="muted small">
        {DOC_TYPES[d.doc_type as string]} · {fmtDateMDY(d.report_date)} · filed by {d.author_name}
        {d.source === "inworld" && <> · <span className="badge gold">in-world</span></>}
      </p>
      <Fleuron />
      <div className="parchment"><pre style={{ fontFamily: "inherit", whiteSpace: "pre-wrap", margin: 0 }}>{d.body}</pre></div>
    </>
  );
}
