-- An hour before a raid night, the members signed up without soft reserves are called on Discord, once
-- (owner's request of 10 October): when it was done.
alter table events add column soft_reserves_reminded_at timestamptz;

-- The production database calls the website's frequent tasks (supabase/schedules.sql, pg_cron and pg_net) with this
-- token, which the website reads here too: no secret to copy between the two. One row.
create table scheduler (
  id boolean primary key default true check (id),
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
insert into scheduler default values;
alter table scheduler enable row level security;
