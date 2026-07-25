-- Sign-in with Second Life username: store it on the member row at signup.
-- Safe to run on an existing project (replaces one function).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into members (id, callsign, sl_username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'callsign', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'sl_username'
  );
  return new;
end $$;
