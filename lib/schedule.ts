export const SL_TIME_ZONE = "America/Los_Angeles";

export type EventRole = { id: string; label: string };

export type ScheduleSignup = {
  member_id: string;
  note: string | null;
  members: { callsign: string };
  event_roles: { label: string };
};

export type ScheduleOccurrence = {
  id: string;
  starts_at: string;
  ends_at: string;
  canceled: boolean;
  events: {
    title: string;
    kind: string;
    description: string | null;
    location: string | null;
    slurl: string | null;
  };
  signups: ScheduleSignup[];
};

type DateParts = { year: number; month: number; day: number };

function zonedDateParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function dateKey(date: Date, timeZone = SL_TIME_ZONE) {
  const { year, month, day } = zonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function occurrenceDateKey(iso: string) {
  return dateKey(new Date(iso));
}

export function currentSLMonth() {
  const { year, month } = zonedDateParts(new Date(), SL_TIME_ZONE);
  return { year, monthIndex: month - 1 };
}

export function parseMonth(value?: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return currentSLMonth();
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (year < 2020 || year > 2100 || monthIndex < 0 || monthIndex > 11) {
    return currentSLMonth();
  }
  return { year, monthIndex };
}

export function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function shiftMonth(year: number, monthIndex: number, delta: number) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

export type CalendarDay = {
  key: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
};

export function calendarDays(year: number, monthIndex: number): CalendarDay[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const gridStart = Date.UTC(year, monthIndex, 1 - first.getUTCDay());
  const today = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart + index * 86_400_000);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    return {
      key,
      dayNumber: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      isToday: key === today,
    };
  });
}

export function calendarQueryBounds(days: CalendarDay[]) {
  const start = new Date(`${days[0].key}T00:00:00.000Z`);
  const end = new Date(`${days.at(-1)!.key}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 2);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function calendarMonthLabel(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export function fmtSLTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: SL_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

