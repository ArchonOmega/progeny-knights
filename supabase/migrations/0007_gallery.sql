-- 0007: Order gallery, upload/management capabilities, and public image storage.
-- Gallery pages remain member-only; the bucket is public so approved images can
-- be served efficiently once their URLs appear on the authenticated page.

insert into capabilities (id, label) values
  ('gallery.upload', 'Upload gallery images'),
  ('gallery.manage', 'Manage gallery images')
on conflict (id) do update set label = excluded.label;

insert into rank_capabilities (rank, cap)
select r.id, c.id
from ranks r
cross join capabilities c
where r.id in ('grandmaster', 'commander')
  and c.id in ('gallery.upload', 'gallery.manage')
on conflict do nothing;

create table gallery_images (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null unique,
  title         text not null check (char_length(title) between 1 and 120),
  caption       text check (caption is null or char_length(caption) <= 1000),
  uploaded_by   uuid references members(id) on delete set null,
  uploader_name text not null,
  created_at    timestamptz not null default now()
);

create index gallery_images_created_idx on gallery_images (created_at desc);
create index gallery_images_uploader_idx on gallery_images (uploaded_by)
  where uploaded_by is not null;

alter table gallery_images enable row level security;

create policy gallery_select on gallery_images
  for select to authenticated
  using (is_member((select auth.uid())));

create policy gallery_insert on gallery_images
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and has_cap((select auth.uid()), 'gallery.upload')
  );

create policy gallery_update on gallery_images
  for update to authenticated
  using (has_cap((select auth.uid()), 'gallery.manage'))
  with check (has_cap((select auth.uid()), 'gallery.manage'));

create policy gallery_delete on gallery_images
  for delete to authenticated
  using (has_cap((select auth.uid()), 'gallery.manage'));

-- New public-schema tables are no longer automatically exposed to the Data API.
grant select, insert, update, delete on table gallery_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-gallery',
  'order-gallery',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

