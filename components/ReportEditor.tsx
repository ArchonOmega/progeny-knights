"use client";
import { useMemo, useState } from "react";
import { DOC_TYPES, docTitle } from "@/lib/format";

export default function ReportEditor({
  reporter, action,
}: { reporter: string; action: (fd: FormData) => Promise<void> }) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const [type, setType] = useState("duty_report");
  const [date, setDate] = useState(today);
  const [custom, setCustom] = useState("");
  const auto = type === "duty_report" || custom.trim() === "";
  const preview = auto ? docTitle(type, date) : custom;

  return (
    <form action={action}>
      <div className="row">
        <label className="fld"><span>Type</span>
          <select name="doc_type" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="fld"><span>Date of record</span>
          <input type="date" name="report_date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="fld"><span>Reporter</span>
          <input type="text" value={reporter} disabled aria-label="Reporter (filled from your account)" />
        </label>
      </div>

      {type !== "duty_report" && (
        <label className="fld"><span>Title (optional; leave blank for the standard form)</span>
          <input type="text" name="title" value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={120} />
        </label>
      )}

      <p className="small muted">Will be saved as: <strong style={{ color: "var(--gold)" }}>{preview}</strong></p>

      <label className="fld"><span>The record</span>
        <textarea
          className="script" name="body" required
          placeholder={"Post: …\nShift: …\nEvents of note: …\n\nNothing stirred that should not."}
        />
      </label>

      <button className="btn primary">Seal &amp; file</button>
    </form>
  );
}
