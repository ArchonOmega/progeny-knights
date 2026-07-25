import { authNode, text } from "@/lib/sl";
import { NextRequest } from "next/server";

/** GET ?id=…&part=1 → one ~3000-char part of a document, prefixed "part/total|title|" */
export async function GET(req: NextRequest) {
  const auth = await authNode(req);
  if (!auth) return text("DENIED", 401);

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const part = Math.max(1, Number(url.searchParams.get("part") ?? 1));
  if (!id) return text("MISSING ID", 400);

  const { data: d } = await auth.admin.from("documents")
    .select("title, body, author_name, report_date").eq("id", id).maybeSingle();
  if (!d) return text("NOT FOUND", 404);

  const SIZE = 3000;
  const total = Math.max(1, Math.ceil(d.body.length / SIZE));
  const slice = d.body.slice((part - 1) * SIZE, part * SIZE);
  return text(`${part}/${total}|${d.title} — ${d.author_name}|${slice}`);
}
