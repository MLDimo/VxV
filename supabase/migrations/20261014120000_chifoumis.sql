-- Chi Fou Mi (owner's request of 14 October): rock, paper, scissors, one against one in game, at the best of three
-- rounds. The players choose the stake, 0 included; the loser owes it until the winner confirms the payment. A game
-- comes from the players' addons once over, with its rounds and the bets placed on it, as a deathroll does.
create table chifoumis (
  -- Chosen by the challenger's addon.
  id text primary key,
  challenger_id uuid not null references characters (id),
  challenged_id uuid not null references characters (id),
  stake integer not null check (stake >= 0),
  accepted_at timestamptz not null,
  ended_at timestamptz not null,
  loser_id uuid not null references characters (id),
  -- The bet the guild placed on the game, if any.
  bet_id uuid references bets (id),
  -- The member whose companion sent it: a player's, or an officer relaying it.
  sent_by uuid not null references members (id),
  recorded_at timestamptz not null,
  -- When the winner confirmed the payment; the loser owes the stake until then.
  paid_at timestamptz,
  constraint chifoumis_two_players check (challenger_id <> challenged_id),
  constraint chifoumis_loser_plays check (loser_id in (challenger_id, challenged_id)),
  constraint chifoumis_ends_after_acceptance check (ended_at >= accepted_at),
  constraint chifoumis_id_not_blank check (length(btrim(id)) > 0)
);

create index chifoumis_ended_at_idx on chifoumis (ended_at);

-- The rounds of a game, in order, draws included: each player's move.
create table chifoumi_rounds (
  chifoumi_id text not null references chifoumis (id) on delete cascade,
  position smallint not null check (position > 0),
  challenger_move text not null check (challenger_move in ('pierre', 'feuille', 'ciseaux')),
  challenged_move text not null check (challenged_move in ('pierre', 'feuille', 'ciseaux')),
  primary key (chifoumi_id, position)
);

alter table chifoumis enable row level security;
alter table chifoumi_rounds enable row level security;
