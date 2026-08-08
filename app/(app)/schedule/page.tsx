import Link from "next/link";
import Fleuron from "@/components/Fleuron";
import MonthCalendar from "@/components/MonthCalendar";
import OccurrenceCard from "@/components/OccurrenceCard";
import { requireSession } from "@/lib/auth";
import { supaServer } from "@/lib/supabase/server";
import {
  type EventRole,
  type ScheduleOccurrence,
  calendarDays,
  calendarMonthLabel,
  calendarQueryBounds,
  currentSLMonth,
  monthKey,
  parseMonth,
  shiftMonth,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

type ScheduleParams = Promise<{ view?: string; month?: string; e?: string }>;

export default async function Schedule({ searchParams }: { searchParams: ScheduleParams }) {
  const [s, params] = await Promise.all([requireSession(), searchParams]);
  const supabase = await supaServer();
  const view = params.view === "agenda" ? "agenda" : "calendar";
  const { year, monthIndex } = parseMonth(params.month);
  const days = calendarDays(year, monthIndex);
  const bounds = calendarQueryBounds(days);

  let occurrenceQuery = supabase.from("occurrences")
    .select("id, starts_at, ends_at, canceled, events(title, kind, description, location, slurl), signups(member_id, note, members(callsign), event_roles(label))")
    .eq("canceled", false)
    .order("starts_at");

  occurrenceQuery = view === "calendar"
    ? occurrenceQuery.gte("starts_at", bounds.start).lt("starts_at", bounds.end).limit(200)
    : occurrenceQuery.gte("starts_at", new Date().toISOString()).limit(50);

  const [{ data: occurrenceData, error: occurrenceError }, { data: roleData, error: roleError }] = await Promise.all([
    occurrenceQuery,
    supabase.from("event_roles").select("id, label").order("sort"),
  ]);

  if (occurrenceError) throw new Error(`Could not load the schedule: ${occurrenceError.message}`);
  if (roleError) throw new Error(`Could not load duty roles: ${roleError.message}`);

  const occurrences = (occurrenceData ?? []) as unknown as ScheduleOccurrence[];
  const roles = (roleData ?? []) as EventRole[];
  const previous = shiftMonth(year, monthIndex, -1);
  const next = shiftMonth(year, monthIndex, 1);
  const current = currentSLMonth();

  return (
    <>
      <div className="page-head">
        <h1>The Schedule</h1>
        {s.caps.has("schedule.manage") && <Link className="btn gold" href="/schedule/new">Decree an event</Link>}
      </div>
      <p className="sub muted">Plan the Order&apos;s duties, RSVP, and see who will stand beside you. All times are shown in SLT.</p>
      <Fleuron label="Duties of the Order" />

      {params.e && <p className="notice error" role="alert">{params.e}</p>}

      <div className="schedule-toolbar" aria-label="Schedule controls">
        <div className="schedule-views">
          <Link className={`btn small${view === "calendar" ? " active" : ""}`} href={`/schedule?view=calendar&month=${monthKey(year, monthIndex)}`}>Calendar</Link>
          <Link className={`btn small${view === "agenda" ? " active" : ""}`} href="/schedule?view=agenda">Agenda</Link>
        </div>
        {view === "calendar" && (
          <div className="month-controls">
            <Link className="btn small" aria-label="Previous month" href={`/schedule?view=calendar&month=${monthKey(previous.year, previous.monthIndex)}`}>‹</Link>
            <Link className="btn small" href={`/schedule?view=calendar&month=${monthKey(current.year, current.monthIndex)}`}>Today</Link>
            <Link className="btn small" aria-label="Next month" href={`/schedule?view=calendar&month=${monthKey(next.year, next.monthIndex)}`}>›</Link>
          </div>
        )}
        <strong className="schedule-period">{view === "calendar" ? calendarMonthLabel(year, monthIndex) : "Upcoming duties"}</strong>
      </div>

      {view === "calendar" && <MonthCalendar days={days} occurrences={occurrences} />}

      <div className="schedule-details-head">
        <h2>{view === "calendar" ? "Event details & attendance" : "Upcoming duties"}</h2>
        <span className="muted small">{occurrences.length} {occurrences.length === 1 ? "occurrence" : "occurrences"}</span>
      </div>

      {!occurrences.length && <p className="empty">Nothing is decreed. Enjoy the stillness while it lasts.</p>}
      {occurrences.map((occurrence) => (
        <OccurrenceCard
          key={occurrence.id}
          occurrence={occurrence}
          roles={roles}
          userId={s.userId}
          canSignup={s.caps.has("schedule.signup")}
          canManage={s.caps.has("schedule.manage")}
        />
      ))}
    </>
  );
}
