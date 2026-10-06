-- The guild's titles (P13): each week (from Wednesday, the day they change), the holder of each title with their
-- score. The history of the holders stays.
create table title_awards (
  week date not null,
  title text not null,
  member_id uuid not null references members (id),
  score integer not null check (score > 0),
  awarded_at timestamptz not null,
  primary key (week, title)
);

alter table title_awards enable row level security;
