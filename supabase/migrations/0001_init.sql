-- ═══════════════════════════════════════════════════════════════════
--  PROGENY KNIGHTS · Foundation migration
--  Schema, ranks & capabilities, RLS, recurrence engine, SL bridge
--  All event times are stored as timestamptz; recurrence math uses
--  SLT (America/Los_Angeles), the grid's own clock.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Enums ──────────────────────────────────────────────────────────
create type doc_type     as enum ('duty_report','notecard','sop','other');
create type doc_source   as enum ('web','inworld');
create type event_kind   as enum ('conclave','court_of_honor','patrol','training','social','other');
create type recur_freq   as enum ('weekly','monthly');
create type wiki_section as enum ('guide','knowledge','wiki');

-- ── Ranks & capabilities ───────────────────────────────────────────
create table ranks (
  id    text primary key,
  title text not null,
  sort  int  not null
);
insert into ranks values
  ('commander','Knight Commander',1),
  ('officer',  'Officer',         2),
  ('knight',   'Knight',          3),
  ('recruit',  'Recruit',         4);

create table capabilities (
  id    text primary key,
  label text not null
);
insert into capabilities values
  ('docs.view',       'View the archive'),
  ('docs.upload',     'File reports & notecards'),
  ('docs.delete',     'Delete documents'),
  ('schedule.signup', 'Report for duty'),
  ('schedule.manage', 'Manage the schedule'),
  ('wiki.edit',       'Edit wiki & guides'),
  ('members.manage',  'Manage the roster'),
  ('nodes.manage',    'Manage in-world nodes'),
  ('audit.view',      'View the audit ledger');

create table rank_capabilities (
  rank text references ranks(id)        on delete cascade,
  cap  text references capabilities(id) on delete cascade,
  primary key (rank, cap)
);
insert into rank_capabilities values
  -- Commander: everything
  ('commander','docs.view'),('commander','docs.upload'),('commander','docs.delete'),
  ('commander','schedule.signup'),('commander','schedule.manage'),('commander','wiki.edit'),
  ('commander','members.manage'),('commander','nodes.manage'),('commander','audit.view'),
  -- Officer
  ('officer','docs.view'),('officer','docs.upload'),('officer','docs.delete'),
  ('officer','schedule.signup'),('officer','schedule.manage'),('officer','wiki.edit'),
  ('officer','audit.view'),
  -- Knight
  ('knight','docs.view'),('knight','docs.upload'),('knight','schedule.signup'),
  -- Recruit
  ('recruit','docs.view'),('recruit','schedule.signup');

-- ── Members ────────────────────────────────────────────────────────
create table members (
  id          uuid primary key references auth.users(id) on delete cascade,
  callsign    text not null,                 -- display / RP name
  sl_username text,                          -- e.g. "darkblade.resident"
  avatar_key  uuid unique,                   -- bound via in-world link code
  rank        text not null default 'recruit' references ranks(id),
  active      boolean not null default true,
  joined_at   timestamptz not null default now()
);

create table member_capabilities (              -- per-member overrides
  member_id uuid references members(id)       on delete cascade,
  cap       text references capabilities(id)  on delete cascade,
  granted   boolean not null,                 -- true = grant, false = revoke
  primary key (member_id, cap)
);

-- Auto-provision a member row when someone signs up.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (id, callsign)
  values (new.id, coalesce(new.raw_user_meta_data->>'callsign', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Permission helpers (security definer → safe inside RLS) ────────
create or replace function is_member(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where id = uid and active);
$$;

create or replace function has_cap(uid uuid, cap_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select granted from member_capabilities where member_id = uid and cap = cap_id),
    exists (
      select 1 from members m
      join rank_capabilities rc on rc.rank = m.rank
      where m.id = uid and m.active and rc.cap = cap_id
    )
  );
$$;

create or replace function my_caps() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(c.id), '{}') from capabilities c
  where has_cap(auth.uid(), c.id);
$$;

-- ── In-world nodes ─────────────────────────────────────────────────
create table nodes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  region     text,
  secret     text not null,                  -- pasted into the LSL script
  object_key uuid,                           -- optional pin to a specific prim
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);

-- ── Documents (duty reports & notecards) ───────────────────────────
create table documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  doc_type    doc_type   not null default 'duty_report',
  report_date date       not null default current_date,
  body        text       not null,
  author_id   uuid references members(id) on delete set null,
  author_name text not null,                 -- survives unlinked avatars
  source      doc_source not null default 'web',
  node_id     uuid references nodes(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  fts tsvector generated always as
    (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) stored
);
create index documents_fts_idx  on documents using gin (fts);
create index documents_date_idx on documents (report_date desc);

-- Chunk reassembly for in-world uploads (service-role only; no policies)
create table sl_upload_sessions (
  id          text primary key,
  node_id     uuid references nodes(id) on delete cascade,
  avatar_key  uuid,
  avatar_name text,
  doc_title   text,
  total       int  not null,
  chunks      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- One-time codes binding an avatar to an account
create table link_codes (
  code       text primary key,
  member_id  uuid not null references members(id) on delete cascade,
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- ── Schedule ───────────────────────────────────────────────────────
create table event_roles (
  id    text primary key,
  label text not null,
  sort  int  not null default 100
);
insert into event_roles values
  ('sb',     'SB Knight',   0),
  ('gate',   'Gate Guard', 10),
  ('honor',  'Honor Guard',20),
  ('escort', 'Escort',     30),
  ('herald', 'Herald',     40),
  ('aide',   'Aide',       50);

create table events (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  kind           event_kind not null default 'other',
  description    text,
  location       text,                       -- region / venue
  slurl          text,
  starts_at      timestamptz not null,       -- anchor (first occurrence)
  duration_mins  int not null default 120,
  recur_freq     recur_freq,                 -- null = one-off
  recur_interval int not null default 1,     -- every N weeks/months
  recur_byday    int[],                      -- 0=Sun … 6=Sat
  recur_week     int,                        -- monthly: 1..4, -1 = last; null = by day-of-month
  recur_until    date,
  created_by     uuid references members(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table occurrences (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references events(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  canceled  boolean not null default false,
  unique (event_id, starts_at)
);
create index occurrences_time_idx on occurrences (starts_at);

create table signups (
  occurrence_id uuid not null references occurrences(id) on delete cascade,
  member_id     uuid not null references members(id)     on delete cascade,
  role_id       text not null default 'sb' references event_roles(id),
  note          text,
  created_at    timestamptz not null default now(),
  primary key (occurrence_id, member_id)
);

create table attendance (
  occurrence_id uuid not null references occurrences(id) on delete cascade,
  avatar_key    uuid not null,
  avatar_name   text not null,
  member_id     uuid references members(id) on delete set null,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  primary key (occurrence_id, avatar_key)
);

-- ── Recurrence engine (runs in SLT) ────────────────────────────────
create or replace function materialize_occurrences(horizon_days int default 90)
returns int language plpgsql security definer set search_path = public as $$
declare
  ev record; d date; anchor_local timestamp; t time; made int := 0;
  from_d date; to_d date; wk_diff int; mo_diff int; dom int; wom int; last_wom boolean;
begin
  for ev in select * from events loop
    anchor_local := ev.starts_at at time zone 'America/Los_Angeles';
    t := anchor_local::time;

    if ev.recur_freq is null then
      insert into occurrences (event_id, starts_at, ends_at)
      values (ev.id, ev.starts_at, ev.starts_at + make_interval(mins => ev.duration_mins))
      on conflict do nothing;
      continue;
    end if;

    from_d := greatest(anchor_local::date, (now() at time zone 'America/Los_Angeles')::date);
    to_d   := least(coalesce(ev.recur_until, 'infinity'::date),
                    (now() at time zone 'America/Los_Angeles')::date + horizon_days);

    for d in select generate_series(from_d, to_d, interval '1 day')::date loop
      if ev.recur_freq = 'weekly' then
        if extract(dow from d)::int <> all (coalesce(ev.recur_byday,
             array[extract(dow from anchor_local)::int])) then continue; end if;
        wk_diff := ((d - extract(dow from d)::int) -
                    (anchor_local::date - extract(dow from anchor_local)::int)) / 7;
        if wk_diff % ev.recur_interval <> 0 then continue; end if;

      elsif ev.recur_freq = 'monthly' then
        mo_diff := (extract(year from d)::int  - extract(year from anchor_local)::int) * 12
                 + (extract(month from d)::int - extract(month from anchor_local)::int);
        if mo_diff % ev.recur_interval <> 0 then continue; end if;
        if ev.recur_week is null then
          if extract(day from d)::int <> extract(day from anchor_local)::int then continue; end if;
        else
          if extract(dow from d)::int <> all (coalesce(ev.recur_byday,
               array[extract(dow from anchor_local)::int])) then continue; end if;
          dom := extract(day from d)::int;
          wom := ((dom - 1) / 7) + 1;
          last_wom := dom > extract(day from (date_trunc('month', d)
                       + interval '1 month - 1 day'))::int - 7;
          if ev.recur_week = -1 then
            if not last_wom then continue; end if;
          elsif wom <> ev.recur_week then continue; end if;
        end if;
      end if;

      insert into occurrences (event_id, starts_at, ends_at)
      values (ev.id,
              (d + t) at time zone 'America/Los_Angeles',
              ((d + t) at time zone 'America/Los_Angeles')
                + make_interval(mins => ev.duration_mins))
      on conflict do nothing;
      if found then made := made + 1; end if;
    end loop;
  end loop;
  return made;
end $$;

-- Materialize immediately whenever an event is created or edited.
create or replace function events_touched() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    delete from occurrences where event_id = new.id and starts_at > now();
  end if;
  perform materialize_occurrences(90);
  return new;
end $$;

create trigger on_event_change
  after insert or update on events
  for each row execute function events_touched();

-- ── Wiki / Guide / Knowledge Base ──────────────────────────────────
create table wiki_pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  section    wiki_section not null default 'wiki',
  title      text not null,
  body       text not null default '',
  sort       int  not null default 100,
  updated_by uuid references members(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table wiki_revisions (
  id        uuid primary key default gen_random_uuid(),
  page_id   uuid not null references wiki_pages(id) on delete cascade,
  body      text not null,
  edited_by uuid references members(id) on delete set null,
  edited_at timestamptz not null default now()
);

create or replace function wiki_snapshot() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.body is distinct from old.body then
    insert into wiki_revisions (page_id, body, edited_by)
    values (old.id, old.body, old.updated_by);
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger on_wiki_update
  before update on wiki_pages
  for each row execute function wiki_snapshot();

-- ── Audit ledger ───────────────────────────────────────────────────
create table audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_name text,
  action     text not null,          -- e.g. 'document.delete'
  entity     text,
  entity_id  text,
  detail     jsonb
);

create or replace function log_action(
  p_actor uuid, p_action text, p_entity text, p_entity_id text, p_detail jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  select callsign into nm from members where id = p_actor;
  insert into audit_log (actor_id, actor_name, action, entity, entity_id, detail)
  values (p_actor, coalesce(nm,'system'), p_action, p_entity, p_entity_id, p_detail);
end $$;

create or replace function documents_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform log_action(auth.uid(), 'document.delete', 'document', old.id::text,
                       jsonb_build_object('title', old.title));
    return old;
  end if;
  perform log_action(auth.uid(), 'document.create', 'document', new.id::text,
                     jsonb_build_object('title', new.title, 'source', new.source));
  return new;
end $$;

create trigger on_document_audit
  after insert or delete on documents
  for each row execute function documents_audit();

-- ── Row Level Security ─────────────────────────────────────────────
alter table members             enable row level security;
alter table member_capabilities enable row level security;
alter table nodes               enable row level security;
alter table documents           enable row level security;
alter table sl_upload_sessions  enable row level security;  -- no policies: service-role only
alter table link_codes          enable row level security;
alter table events              enable row level security;
alter table occurrences         enable row level security;
alter table signups             enable row level security;
alter table attendance          enable row level security;
alter table wiki_pages          enable row level security;
alter table wiki_revisions      enable row level security;
alter table audit_log           enable row level security;
alter table ranks               enable row level security;
alter table capabilities        enable row level security;
alter table rank_capabilities   enable row level security;
alter table event_roles         enable row level security;

-- Lookup tables: readable by any signed-in user
create policy lk_ranks  on ranks             for select using (auth.role() = 'authenticated');
create policy lk_caps   on capabilities      for select using (auth.role() = 'authenticated');
create policy lk_rcaps  on rank_capabilities for select using (auth.role() = 'authenticated');
create policy lk_eroles on event_roles       for select using (auth.role() = 'authenticated');

-- Members: roster visible to members; self always; managed by members.manage
create policy mem_select on members for select
  using (id = auth.uid() or is_member(auth.uid()));
create policy mem_update on members for update
  using (has_cap(auth.uid(),'members.manage'));

create policy mcap_select on member_capabilities for select
  using (member_id = auth.uid() or has_cap(auth.uid(),'members.manage'));
create policy mcap_write on member_capabilities for all
  using (has_cap(auth.uid(),'members.manage'));

-- Nodes: admins only
create policy nodes_all on nodes for all
  using (has_cap(auth.uid(),'nodes.manage'));

-- Documents
create policy docs_select on documents for select
  using (has_cap(auth.uid(),'docs.view'));
create policy docs_insert on documents for insert
  with check (has_cap(auth.uid(),'docs.upload') and author_id = auth.uid());
create policy docs_update on documents for update
  using (author_id = auth.uid() or has_cap(auth.uid(),'docs.delete'));
create policy docs_delete on documents for delete
  using (has_cap(auth.uid(),'docs.delete'));

-- Link codes: own codes only
create policy link_own on link_codes for all
  using (member_id = auth.uid()) with check (member_id = auth.uid());

-- Schedule
create policy ev_select  on events      for select using (is_member(auth.uid()));
create policy ev_write   on events      for all    using (has_cap(auth.uid(),'schedule.manage'));
create policy occ_select on occurrences for select using (is_member(auth.uid()));
create policy occ_write  on occurrences for all    using (has_cap(auth.uid(),'schedule.manage'));

create policy su_select on signups for select using (is_member(auth.uid()));
create policy su_insert on signups for insert
  with check (member_id = auth.uid() and has_cap(auth.uid(),'schedule.signup'));
create policy su_update on signups for update
  using (member_id = auth.uid());
create policy su_delete on signups for delete
  using (member_id = auth.uid() or has_cap(auth.uid(),'schedule.manage'));

create policy att_select on attendance for select using (is_member(auth.uid()));

-- Wiki
create policy wiki_select on wiki_pages for select using (is_member(auth.uid()));
create policy wiki_write  on wiki_pages for all    using (has_cap(auth.uid(),'wiki.edit'));
create policy wrev_select on wiki_revisions for select using (is_member(auth.uid()));

-- Audit
create policy audit_select on audit_log for select using (has_cap(auth.uid(),'audit.view'));

-- ── Starter content ────────────────────────────────────────────────
insert into wiki_pages (slug, section, title, sort, body) values
('welcome','guide','Welcome to the Order',10,
'# Welcome to the Order

You stand among the Progeny Knights — shield of the realm, sword of the court.

This guide will carry you from your first night to your knighting. Read it in order:

1. **The Oath & Conduct** — what we expect of every blade
2. **Duty Reports** — how and when to file
3. **Event Protocol** — conclaves, Court of Honor, and your place in them'),
('oath-and-conduct','guide','The Oath & Conduct',20,
'# The Oath & Conduct

*Write your order''s oath and rules of conduct here.*'),
('duty-reports','guide','Filing Duty Reports',30,
'# Filing Duty Reports

File a report after every patrol or event you work.

**From the web:** Archive → *File a report*. The date and your name are filled in for you.

**In-world:** drop your notecard into any Archive Node. It lands here automatically, credited to you if your avatar is linked (Settings → *Link avatar*).'),
('ranks-and-roles','knowledge','Ranks & Event Roles',10,
'# Ranks & Event Roles

| Rank | Duties |
|------|--------|
| Knight Commander | Command of the Order |
| Officer | Scheduling, archive stewardship |
| Knight | Patrol, event duty |
| Recruit | Training under a sponsor |

Event roles: SB Knight (default), Gate Guard, Honor Guard, Escort, Herald, Aide.'),
('glossary','knowledge','Glossary',20,
'# Glossary

*Terms every knight should know. Add to this freely.*');
