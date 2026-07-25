# Progeny Knights — Order Management System

A complete web + in-world system for a Second Life knightly order:

- **The Archive** — duty reports & notecards, filed from the web editor or by dropping a notecard on an in-world node. Sortable, full-text searchable.
- **The Schedule** — one-off and recurring events (weekly, every N weeks, "2nd Friday", "last Sunday"…), with *Report for duty* signups and role selection (SB Knight by default). All times in SLT.
- **The Codex** — Guide, Knowledge Base, and Chronicles (wiki) in Markdown, with automatic revision history.
- **The Roster** — ranks (Commander / Officer / Knight / Recruit) plus per-member capability overrides (grant or revoke any single right for any single member).
- **In-world bridge** — upload node, archive browser + MOAP screen, avatar linking, and an attendance scanner that logs who actually showed up.
- **Audit ledger** — creations, deletions, and rank changes are recorded.

**Stack:** Next.js 15 (App Router) on Vercel · Supabase (Postgres + Auth + RLS) · LSL scripts in-world. Two free-tier services, one daily cron.

---

## 1 · Supabase setup (~5 minutes)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the entire contents of `supabase/migrations/0001_init.sql`, and run it. This creates every table, the permission system, the recurrence engine, RLS policies, and starter Codex pages.
3. **Authentication → Providers → Email**: decide whether to require email confirmation. For a private guild site, turning confirmation *off* is simplest.
4. **Project Settings → API**: copy the *URL*, *anon* key, and *service_role* key.

### Crown the first Commander

Sign up through the site (step 2 below) first, then in the SQL Editor:

```sql
update members set rank = 'commander'
where callsign = 'YourCallsign';
```

Everything else — promoting officers, granting rights — is done from the Roster page afterward.

## 2 · Deploy to Vercel

1. Push this folder to a Git repo and import it in [vercel.com](https://vercel.com) (defaults are fine).
2. Add the environment variables from `.env.example`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server-only) |
| `CRON_SECRET` | any long random string |
| `NEXT_PUBLIC_SITE_URL` | your deployed URL |

3. `vercel.json` already schedules a daily cron (`/api/cron/materialize`) that keeps ~90 days of recurring occurrences materialized and sweeps expired link codes / stale uploads. Vercel sends `CRON_SECRET` automatically on Pro; on Hobby, set the cron's auth header or simply rely on the fact that events are *also* materialized instantly by a database trigger whenever one is created or edited — the cron only extends the horizon.

Local development: copy `.env.example` → `.env.local`, fill it in, then `npm install && npm run dev`.

## 3 · In-world setup

1. On the site, go to **Settings → In-world nodes** (Commander only) and *Forge node* — one per scripted object. Each shows a `NODE_ID` and `NODE_SECRET`.
2. Rez a prim, create a new script, paste one of the scripts from `lsl/`, and fill in the CONFIG block at the top (`API_BASE`, `NODE_ID`, `NODE_SECRET`).

| Script | Purpose |
|---|---|
| `pk_upload_node.lsl` | Drop a notecard on it → filed in the archive. Credits the notecard's **creator**; if their avatar is linked, it's credited to their web account. Anything named like "duty report" is auto-titled `Duty Report [MM/DD/YYYY]`. |
| `pk_archive_node.lsl` | Touch to browse & read records via dialog (sortable, paginated). Also the **link terminal**: members say `/77 link 123456` (code from Settings) to bind their avatar. Set `MEDIA_FACE` to a face number to show the live web archive on the prim (MOAP). |
| `pk_attendance_scanner.lsl` | Place at the venue; every 5 minutes it records who's on the parcel. The server matches sweeps to whichever scheduled occurrence is within ±3 hours, and links avatars to accounts when possible. |

### Notes & limits

- LSL notecard reading truncates very long lines (~255 chars on most grid versions). Tell knights to use ordinary line lengths; blank lines and formatting survive fine.
- Long notecards are uploaded in ~2.8 KB chunks and reassembled server-side; long documents are read back in parts.
- Node secrets travel over HTTPS only. If a node prim is compromised, *Decommission* it on the Settings page — its secret dies with it.
- The optional `object_key` column on `nodes` can pin a node to one specific prim UUID for extra strictness (set it via SQL if desired).

## 4 · How the permission system works

Each **rank** carries default capabilities (see `rank_capabilities` in the migration). On the Roster page you can additionally **grant** or **revoke** any single capability for any single member — e.g. give one trusted Knight `schedule.manage`, or revoke `docs.delete` from one Officer. Overrides always beat rank defaults, and everything is enforced in the database by Row Level Security — not just hidden in the UI.

Capabilities: `docs.view` · `docs.upload` · `docs.delete` · `schedule.signup` · `schedule.manage` · `wiki.edit` · `members.manage` · `nodes.manage` · `audit.view`

## 5 · Recurring events cheat-sheet

| Want | Set |
|---|---|
| Every Saturday | Weekly, every 1, day Sat |
| Every 2 weeks | Weekly, every 2 |
| Monthly on the 15th | Monthly, week "same day of month", first occurrence on a 15th |
| 2nd Friday monthly | Monthly, week 2nd, day Fri |
| Last Sunday monthly | Monthly, week Last, day Sun |

Occurrences repeat at the first occurrence's hour **in SLT**, so DST never drifts your conclave.

---

*Shield of the realm · sword of the court* ❖
