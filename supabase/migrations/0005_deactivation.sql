-- 0005: Deactivation always wins — an inactive member holds no rights,
-- even if they carry granted capability overrides.
create or replace function has_cap(uid uuid, cap_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_member(uid) and coalesce(
    (select granted from member_capabilities where member_id = uid and cap = cap_id),
    exists (
      select 1 from members m
      join rank_capabilities rc on rc.rank = m.rank
      where m.id = uid and rc.cap = cap_id
    )
  );
$$;
