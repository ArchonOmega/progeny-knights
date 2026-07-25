import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import { savePage } from "../actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WikiPage({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string }> }) {
  const s = await requireSession();
  const { slug } = await params;
  const { edit } = await searchParams;
  const supabase = await supaServer();
  const { data: p } = await supabase.from("wiki_pages").select("*").eq("slug", slug).single();
  if (!p) notFound();

  const editing = edit === "1" && s.caps.has("wiki.edit");

  return (
    <>
      <div className="page-head">
        <h1>{p.title}</h1>
        <span>
          <Link className="btn small" href="/wiki">Codex</Link>{" "}
          {s.caps.has("wiki.edit") && !editing && (
            <Link className="btn small gold" href={`/wiki/${slug}?edit=1`}>Edit</Link>
          )}
        </span>
      </div>
      <Fleuron />

      {editing ? (
        <form action={savePage}>
          <input type="hidden" name="slug" value={p.slug} />
          <label className="fld"><span>Title</span>
            <input name="title" type="text" defaultValue={p.title} required maxLength={80} />
          </label>
          <label className="fld"><span>Body — Markdown</span>
            <textarea className="script mono" name="body" defaultValue={p.body} style={{ fontFamily: "ui-monospace, monospace", fontSize: ".92rem" }} />
          </label>
          <button className="btn primary">Save page</button>{" "}
          <Link className="btn" href={`/wiki/${slug}`}>Discard</Link>
          <p className="small muted">Every save keeps the previous version in the page&apos;s history.</p>
        </form>
      ) : (
        <div className="parchment">
          <Markdown remarkPlugins={[remarkGfm]}>{p.body}</Markdown>
        </div>
      )}
    </>
  );
}
