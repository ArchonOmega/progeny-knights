const SLT = "America/Los_Angeles";

export function fmtDateMDY(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function fmtSLT(iso: string) {
  const dt = new Date(iso);
  return (
    dt.toLocaleString("en-US", {
      timeZone: SLT, weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    }) + " SLT"
  );
}

export function docTitle(type: string, dateISO: string) {
  const label =
    type === "duty_report" ? "Duty Report" :
    type === "sop" ? "Standing Order" : "Notecard";
  return `${label} [${fmtDateMDY(dateISO)}]`;
}

export const DOC_TYPES: Record<string, string> = {
  duty_report: "Duty Report", notecard: "Notecard", sop: "Standing Order", other: "Other",
};

export const EVENT_KINDS: Record<string, string> = {
  conclave: "Conclave", court_of_honor: "Court of Honor", patrol: "Patrol",
  training: "Training", social: "Social", other: "Event",
};
