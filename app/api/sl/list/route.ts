import { authNode, text } from "@/lib/sl";
import { NextRequest } from "next/server";

/** Plain-text listing for in-world browsing.
 *  GET ?page=1&sort=date|title|reporter  →  "id|MM/DD|title|reporter" per line */
export async function GET(req: NextRequest) {
  const auth = await authNode(req);
  if (!auth) return text("DENIED", 401);

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const sort = url.searchParams.get("sort") ?? "date";
  const per = 9;
  const col = sort === "title" ? "title" : sort === "reporter" ? "author_name" : "report_date";

  const { data } = await auth.admin
    .from("documents")
    .select("id, title, report_date, author_name")
    .order(col, { ascending: sort === "title" })
    .order("created_at", { ascending: false })
    .range((page - 1) * per, page * per - 1);

  const lines = (data ?? []).map((d) => {
    const [y, m, day] = String(d.report_date).split("-");
    return `${d.id}|${m}/${day}/${y.slice(2)}|${d.title}|${d.author_name}`;
  });
  return text(lines.join("\n") || "EMPTY");
}
