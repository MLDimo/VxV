-- Initial schema: guild members and characters, raid reference data, events, sign-ups,
-- soft reserves, exclusions, loots and the append-only journal.
--
-- Access model: every table enables row level security without any policy, so the public
-- Supabase roles (anon, authenticated) can neither read nor write. Only the server, using the
-- service role, accesses the data and enforces permissions.

-- Enumerations ------------------------------------------------------------------------------

create type member_role as enum ('member', 'officer', 'treasurer', 'gm');
create type signup_role as enum ('tank', 'healer', 'dps');
create type signup_status as enum ('present', 'maybe', 'late', 'bench', 'absent');

-- Guild -------------------------------------------------------------------------------------

create table members (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_name text not null,
  role member_role not null default 'member',
  created_at timestamptz not null default now()
);

-- A WoW Forever character is identified by its first and last name, unique across the game.
create table characters (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  class text not null,
  member_id uuid references members (id) on delete set null,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  unique (first_name, last_name),
  constraint characters_main_requires_member check (not is_main or member_id is not null)
);

create unique index characters_one_main_per_member on characters (member_id) where is_main;

-- Raid reference data, generated from data/raids/*.json -----------------------------------

create table raids (
  id text primary key,
  name text not null,
  instance_id integer not null unique
);

create table bosses (
  encounter_id integer primary key,
  raid_id text not null references raids (id) on delete cascade,
  name text not null,
  position smallint not null check (position > 0),
  -- Deferred so that a regenerated raid can reorder its bosses inside one transaction.
  constraint bosses_raid_position_key unique (raid_id, position) deferrable initially deferred
);

create table items (
  id integer primary key,
  name text not null
);

create table boss_loot (
  encounter_id integer not null references bosses (encounter_id) on delete cascade,
  item_id integer not null references items (id),
  primary key (encounter_id, item_id)
);

-- Events and sign-ups -----------------------------------------------------------------------

create table events (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  soft_reserves_per_player smallint not null default 1 check (soft_reserves_per_player >= 1),
  created_by uuid not null references members (id),
  created_at timestamptz not null default now()
);

create table event_raids (
  event_id uuid not null references events (id) on delete cascade,
  raid_id text not null references raids (id),
  primary key (event_id, raid_id)
);

create table signups (
  event_id uuid not null references events (id) on delete cascade,
  character_id uuid not null references characters (id),
  role signup_role not null,
  spec text not null,
  status signup_status not null default 'present',
  updated_at timestamptz not null default now(),
  primary key (event_id, character_id)
);

-- A soft reserve always belongs to a sign-up of the same event.
create table soft_reserves (
  event_id uuid not null,
  character_id uuid not null,
  item_id integer not null references items (id),
  created_at timestamptz not null default now(),
  primary key (event_id, character_id, item_id),
  foreign key (event_id, character_id) references signups (event_id, character_id) on delete cascade
);

-- Who excluded an item and why is recorded in the journal.
create table exclusions (
  event_id uuid not null references events (id) on delete cascade,
  item_id integer not null references items (id),
  primary key (event_id, item_id)
);

create table loots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id),
  encounter_id integer not null references bosses (encounter_id),
  item_id integer not null references items (id),
  character_id uuid not null references characters (id),
  looted_at timestamptz not null
);

-- Journal: append-only record of every officer action, with a mandatory reason ------------

create table journal (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid not null references members (id),
  action text not null,
  entity text not null,
  entity_id text not null,
  before jsonb,
  after jsonb,
  reason text not null,
  constraint journal_reason_not_blank check (length(btrim(reason)) > 0)
);

create function journal_reject_change() returns trigger
language plpgsql as $$
begin
  raise exception 'journal is append-only: % is not allowed', tg_op;
end;
$$;

create trigger journal_append_only
  before update or delete on journal
  for each row execute function journal_reject_change();

create trigger journal_no_truncate
  before truncate on journal
  for each statement execute function journal_reject_change();

-- Row level security ------------------------------------------------------------------------

alter table members enable row level security;
alter table characters enable row level security;
alter table raids enable row level security;
alter table bosses enable row level security;
alter table items enable row level security;
alter table boss_loot enable row level security;
alter table events enable row level security;
alter table event_raids enable row level security;
alter table signups enable row level security;
alter table soft_reserves enable row level security;
alter table exclusions enable row level security;
alter table loots enable row level security;
alter table journal enable row level security;
