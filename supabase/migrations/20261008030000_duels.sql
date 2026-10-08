-- Duels (owner's request of 7 October): a member challenges another to a 1v1 at a date, a time and a place. Once the
-- opponent accepts, the guild bets on it with an ordinary bet; the duel ends played (its winner) or called off. The
-- duels played make an Elo ranking, computed from them.
create table duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references members (id),
  opponent_id uuid not null references members (id),
  scheduled_at timestamptz not null,
  place text not null,
  created_at timestamptz not null default now(),
  accepted boolean,
  answered_at timestamptz,
  bet_id uuid unique references bets (id),
  winner_id uuid references members (id),
  played_at timestamptz,
  cancelled_at timestamptz,
  -- The duel's message on Discord, refreshed as it goes.
  discord_channel_id text,
  discord_message_id text,
  constraint duels_two_players check (challenger_id <> opponent_id),
  constraint duels_place_not_blank check (length(btrim(place)) > 0),
  constraint duels_answered check ((accepted is null) = (answered_at is null)),
  constraint duels_bet_accepted check (bet_id is null or accepted is true),
  constraint duels_winner_plays check (winner_id is null or winner_id in (challenger_id, opponent_id)),
  constraint duels_played check ((winner_id is null) = (played_at is null)),
  constraint duels_played_accepted check (winner_id is null or accepted is true),
  constraint duels_ends_once check (winner_id is null or cancelled_at is null)
);

create index duels_scheduled_at_idx on duels (scheduled_at);

alter table duels enable row level security;
