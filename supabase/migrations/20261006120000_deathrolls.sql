-- Deathrolls (P15): one against one in game. The challenged rolls first from the starting number, each next roll
-- from 1 to the previous result; who rolls 1 loses the stake to the other, and owes it until the winner confirms
-- the payment. A game comes from the players' addons once over, with its rolls and the bets placed on it.
create table deathrolls (
  -- Chosen by the challenger's addon.
  id text primary key,
  challenger_id uuid not null references characters (id),
  challenged_id uuid not null references characters (id),
  stake integer not null check (stake >= 1),
  start_number integer not null check (start_number >= 2),
  accepted_at timestamptz not null,
  ended_at timestamptz not null,
  -- The character who rolled 1.
  loser_id uuid not null references characters (id),
  -- The bet the guild placed on the game, if any.
  bet_id uuid references bets (id),
  -- The member whose companion sent it: a player's, or an officer relaying it.
  sent_by uuid not null references members (id),
  recorded_at timestamptz not null,
  -- When the winner confirmed the payment; the loser owes the stake until then.
  paid_at timestamptz,
  constraint deathrolls_two_players check (challenger_id <> challenged_id),
  constraint deathrolls_loser_plays check (loser_id in (challenger_id, challenged_id)),
  constraint deathrolls_ends_after_acceptance check (ended_at >= accepted_at),
  constraint deathrolls_id_not_blank check (length(btrim(id)) > 0)
);

create index deathrolls_ended_at_idx on deathrolls (ended_at);

-- The rolls of a game, in order: each between 1 and its high.
create table deathroll_rolls (
  deathroll_id text not null references deathrolls (id) on delete cascade,
  position smallint not null check (position > 0),
  character_id uuid not null references characters (id),
  high integer not null check (high >= 1),
  result integer not null,
  primary key (deathroll_id, position),
  constraint deathroll_rolls_in_range check (result between 1 and high)
);

alter table deathrolls enable row level security;
alter table deathroll_rolls enable row level security;
