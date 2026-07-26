"use client";
import { useState } from "react";
import { EVENT_KINDS } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EventForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [freq, setFreq] = useState("");

  return (
    <form action={action}>
      <div className="row">
        <label className="fld" style={{ flex: 2 }}><span>Title</span>
          <input name="title" type="text" required maxLength={120} placeholder="Conclave of the Bloodline" />
        </label>
        <label className="fld"><span>Kind</span>
          <select name="kind" defaultValue="other">
            {Object.entries(EVENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>

      <label className="fld"><span>Description</span>
        <input name="description" type="text" maxLength={300} placeholder="What the Order must know" />
      </label>

      <div className="row">
        <label className="fld"><span>Region / venue</span>
          <input name="location" type="text" placeholder="Crimson Keep" />
        </label>
        <label className="fld"><span>SLurl</span>
          <input name="slurl" type="text" placeholder="http://maps.secondlife.com/…" />
        </label>
      </div>

      <div className="row">
        <label className="fld"><span>First occurrence (your local time)</span>
          <input name="starts_at" type="datetime-local" required />
        </label>
        <label className="fld"><span>Duration (minutes)</span>
          <input name="duration_mins" type="number" defaultValue={120} min={15} step={15} />
        </label>
        <label className="fld"><span>Repeats</span>
          <select name="recur_freq" value={freq} onChange={(e) => setFreq(e.target.value)}>
            <option value="">Never (one night only)</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
      </div>

      {freq && (
        <div className="card">
          <div className="row">
            <label className="fld"><span>Every</span>
              <input name="recur_interval" type="number" defaultValue={1} min={1} max={12}
                aria-label={freq === "weekly" ? "weeks" : "months"} />
            </label>
            <label className="fld"><span>Until (optional)</span>
              <input name="recur_until" type="date" />
            </label>
            {freq === "monthly" && (
              <label className="fld"><span>Which week</span>
                <select name="recur_week" defaultValue="">
                  <option value="">Same day of month as first</option>
                  <option value="1">1st</option><option value="2">2nd</option>
                  <option value="3">3rd</option><option value="4">4th</option>
                  <option value="-1">Last</option>
                </select>
              </label>
            )}
          </div>
          <span className="small muted" style={{ display: "block", marginBottom: ".4rem" }}>
            {freq === "weekly"
              ? "On these days (leave empty to use the first occurrence's day):"
              : "If a week is chosen above, on these days:"}
          </span>
          <div className="row" style={{ alignItems: "center" }}>
            {DAYS.map((d, i) => (
              <label key={d} className="tight" style={{ display: "flex", gap: ".3rem", alignItems: "center" }}>
                <input type="checkbox" name="byday" value={i} /> {d}
              </label>
            ))}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Every 2 weeks: set Repeats to Weekly, Every to 2. Second Friday monthly: Monthly, week 2nd, day Fri.
            Occurrences recur at the first occurrence&apos;s hour, in SLT.
          </p>
        </div>
      )}

      <button className="btn primary">Decree it</button>
    </form>
  );
}
