import { cancelOccurrence, reportForDuty, standDown } from "@/app/(app)/schedule/actions";
import { EVENT_KINDS, fmtSLT } from "@/lib/format";
import type { EventRole, ScheduleOccurrence } from "@/lib/schedule";
import SubmitButton from "@/components/SubmitButton";

export default function OccurrenceCard({
  occurrence,
  roles,
  userId,
  canSignup,
  canManage,
}: {
  occurrence: ScheduleOccurrence;
  roles: EventRole[];
  userId: string;
  canSignup: boolean;
  canManage: boolean;
}) {
  const signups = occurrence.signups.toSorted((a, b) =>
    a.members.callsign.localeCompare(b.members.callsign)
  );
  const mine = signups.find((signup) => signup.member_id === userId);

  return (
    <article className="card occurrence-card" id={`occ-${occurrence.id}`}>
      <div className="occurrence-heading">
        <div>
          <span className="tag-kind">{EVENT_KINDS[occurrence.events.kind] ?? occurrence.events.kind}</span>
          <h3>{occurrence.events.title}</h3>
        </div>
        <time className="occurrence-time" dateTime={occurrence.starts_at}>{fmtSLT(occurrence.starts_at)}</time>
      </div>

      {occurrence.events.location && (
        <div className="small muted">
          {occurrence.events.slurl
            ? <a href={occurrence.events.slurl} target="_blank" rel="noreferrer">{occurrence.events.location}</a>
            : occurrence.events.location}
        </div>
      )}
      {occurrence.events.description && <p className="occurrence-description">{occurrence.events.description}</p>}

      <div className="signup-section">
        <div className="signup-title">
          <strong>Attending</strong>
          <span className="badge gold">{signups.length}</span>
        </div>
        {signups.length > 0 ? (
          <ul className="signup-roster">
            {signups.map((signup) => (
              <li key={signup.member_id}>
                <span>{signup.members.callsign}</span>
                <span className="muted">{signup.event_roles.label}</span>
                {signup.note && <small>{signup.note}</small>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted signup-empty">No one has signed up yet.</p>
        )}
      </div>

      {canSignup && (
        <div className="attendance-actions">
          <form action={reportForDuty} className="attendance-form">
            <input type="hidden" name="occurrence_id" value={occurrence.id} />
            <label className="fld">
              <span>Duty role</span>
              <select name="role_id" defaultValue={mine?.event_roles.label ? roles.find((role) => role.label === mine.event_roles.label)?.id ?? "sb" : "sb"}>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
            </label>
            <label className="fld attendance-note">
              <span>Note (optional)</span>
              <input type="text" name="note" defaultValue={mine?.note ?? ""} maxLength={200} placeholder="Anything the Order should know" />
            </label>
            <SubmitButton className="btn primary small" pendingText="Marking…">
              {mine ? "Update RSVP" : "Mark attending"}
            </SubmitButton>
          </form>
          {mine && (
            <form action={standDown}>
              <input type="hidden" name="occurrence_id" value={occurrence.id} />
              <SubmitButton className="btn small" pendingText="Standing down…">Stand down</SubmitButton>
            </form>
          )}
        </div>
      )}

      {canManage && (
        <form action={cancelOccurrence} className="cancel-occurrence">
          <input type="hidden" name="id" value={occurrence.id} />
          <SubmitButton className="btn small" pendingText="Canceling…">Cancel this occurrence</SubmitButton>
        </form>
      )}
    </article>
  );
}

