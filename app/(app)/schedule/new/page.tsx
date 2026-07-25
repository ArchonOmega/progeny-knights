import Fleuron from "@/components/Fleuron";
import { requireSession } from "@/lib/auth";
import { createEvent } from "../actions";
import EventForm from "@/components/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEvent({
  searchParams,
}: { searchParams: Promise<{ e?: string }> }) {
  const s = await requireSession();
  const { e } = await searchParams;
  if (!s.caps.has("schedule.manage")) {
    return <p className="empty">Only those charged with the schedule may decree events.</p>;
  }
  return (
    <>
      <div className="page-head"><h1>Decree an Event</h1></div>
      <Fleuron label="By order of the Knights" />
      {e && <div className="card" style={{ borderColor: "var(--blood)" }}>{e}</div>}
      <EventForm action={createEvent} />
    </>
  );
}
