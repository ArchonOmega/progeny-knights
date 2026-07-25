-- 0003: Squire rank + honorific titles (a second designation shown beside rank)

insert into ranks values ('squire','Squire',4) on conflict (id) do nothing;
update ranks set sort = 5 where id = 'recruit';

insert into rank_capabilities values
  ('squire','docs.view'),
  ('squire','docs.upload'),
  ('squire','schedule.signup')
on conflict do nothing;

alter table members add column if not exists title text;
