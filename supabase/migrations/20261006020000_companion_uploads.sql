-- What the companions send to the website (P7.4).

-- Each character as the game draws it, told by the addon of its own player: race token (Orc, Scourge…) and sex,
-- for the avatars.
alter table characters add column race text check (race ~ '^[A-Za-z]{1,30}$');
alter table characters add column sex text check (sex in ('male', 'female'));

-- When the latest copy of some data, read in game, was imported: an older copy sent by another officer's companion
-- is ignored. One row per kind of data ("roster").
create table sync_marks (
  kind text primary key,
  captured_at timestamptz not null
);

-- The most complete record of each raid sent by the companions: the raid's recap is published from it once the
-- raid is over.
create table raid_logs (
  event_id uuid primary key references events (id) on delete cascade,
  content text not null,
  received_at timestamptz not null default now()
);

alter table sync_marks enable row level security;
alter table raid_logs enable row level security;
