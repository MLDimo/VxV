-- Weekly missions (P12): an officer publishes a challenge counted by the game itself; the addons read their
-- characters' counters and the companions bring the readings; the score is what a counter gained during the
-- mission. An officer validates the result, the first three share the reward, which the treasurer hands over.

create type mission_type as enum ('fishing', 'herbalism', 'mining', 'skinning', 'honorableKills');

create table missions (
  id uuid primary key default gen_random_uuid(),
  type mission_type not null,
  title text not null,
  reward integer not null check (reward >= 1),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null references members (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references members (id),
  -- The mission's message on Discord.
  discord_channel_id text,
  discord_message_id text,
  constraint missions_title_not_blank check (length(btrim(title)) > 0),
  constraint missions_ends_after_start check (ends_at > starts_at),
  constraint missions_closed_by_officer check ((closed_at is null) = (closed_by is null))
);

create index missions_ends_at_idx on missions (ends_at);

-- A character's game counter as its addon read it, at an instant: the same reading sent twice is kept once.
create table counter_readings (
  character_id uuid not null references characters (id) on delete cascade,
  type mission_type not null,
  value integer not null check (value >= 0),
  read_at timestamptz not null,
  -- The member whose companion sent it: the character's own, or an officer relaying it.
  sent_by uuid not null references members (id),
  primary key (character_id, type, read_at)
);

-- The rewards of a closed mission, by place; the treasurer notes each one handed over.
create table mission_rewards (
  mission_id uuid not null references missions (id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  member_id uuid not null references members (id),
  amount integer not null check (amount >= 0),
  paid_at timestamptz,
  paid_by uuid references members (id),
  primary key (mission_id, rank),
  constraint mission_rewards_paid_by_treasurer check ((paid_at is null) = (paid_by is null))
);

-- A reward handed over leaves the guild's cash with its mission.
alter table cash_movements add column mission_id uuid references missions (id);

alter table missions enable row level security;
alter table counter_readings enable row level security;
alter table mission_rewards enable row level security;
