import { EVENT_KINDS } from "@/lib/format";
import {
  type CalendarDay,
  type ScheduleOccurrence,
  fmtSLTime,
  occurrenceDateKey,
} from "@/lib/schedule";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MonthCalendar({
  days,
  occurrences,
}: {
  days: CalendarDay[];
  occurrences: ScheduleOccurrence[];
}) {
  const byDay = new Map<string, ScheduleOccurrence[]>();
  for (const occurrence of occurrences) {
    const key = occurrenceDateKey(occurrence.starts_at);
    const current = byDay.get(key);
    if (current) current.push(occurrence);
    else byDay.set(key, [occurrence]);
  }

  return (
    <div className="calendar-scroll">
      <div className="calendar" aria-label="Monthly event calendar">
        {WEEKDAYS.map((day) => (
          <div className="calendar-weekday" key={day}>{day.slice(0, 3)}</div>
        ))}
        {days.map((day) => (
          <section
            className={`calendar-day${day.inMonth ? "" : " outside"}${day.isToday ? " today" : ""}`}
            key={day.key}
            aria-label={new Date(`${day.key}T12:00:00Z`).toLocaleDateString("en-US", {
              timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          >
            <time className="calendar-date" dateTime={day.key}>{day.dayNumber}</time>
            <div className="calendar-events">
              {(byDay.get(day.key) ?? []).map((occurrence) => (
                <a
                  className="calendar-event"
                  data-kind={occurrence.events.kind}
                  href={`#occ-${occurrence.id}`}
                  key={occurrence.id}
                  title={`${EVENT_KINDS[occurrence.events.kind] ?? "Event"}: ${occurrence.events.title}`}
                >
                  <time dateTime={occurrence.starts_at}>{fmtSLTime(occurrence.starts_at)}</time>
                  <span>{occurrence.events.title}</span>
                  {occurrence.signups.length > 0 && (
                    <small aria-label={`${occurrence.signups.length} signed up`}>{occurrence.signups.length}</small>
                  )}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

