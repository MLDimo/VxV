-- The bosses killed as the companions read them in the game's combat log (phase 0, T11, 7 October): the healing each
-- player received (Princesse), which the game's meter does not give. Each raider's companion sends its own record of a
-- fight (the text VXV-COMBAT-1); the most complete one is kept.
create table boss_fights (
  id uuid primary key default gen_random_uuid(),
  encounter_id integer not null check (encounter_id > 0),
  ended_at timestamptz not null,
  content text not null,
  total_healing bigint not null check (total_healing >= 0),
  -- The member whose companion sent it.
  sent_by uuid not null references members (id),
  received_at timestamptz not null
);

create index boss_fights_encounter_id_ended_at_idx on boss_fights (encounter_id, ended_at);

alter table boss_fights enable row level security;
