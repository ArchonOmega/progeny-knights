import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { createDocument } from "../actions";
import ReportEditor from "@/components/ReportEditor";

export const dynamic = "force-dynamic";

export default async function NewReport({
  searchParams,
}: { searchParams: Promise<{ e?: string }> }) {
  const s = await requireSession();
  const { e } = await searchParams;

  if (!s.caps.has("docs.upload")) {
    return <p className="empty">You do not yet hold the right to file reports. Speak with an officer.</p>;
  }

  return (
    <>
      <div className="page-head"><h1>File a Report</h1></div>
      <Fleuron label="Let the record show" />
      {e && <div className="card" style={{ borderColor: "var(--blood)" }}>{e}</div>}
      <ReportEditor reporter={s.callsign} action={createDocument} />
    </>
  );
}
