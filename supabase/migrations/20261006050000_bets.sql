-- Mutual bets (P11): an officer opens a bet with its choices and its closing time; every member stakes whole gold
-- pieces on one choice, until the closing time. The pool, the odds and the gains are computed from the stakes.

create table bets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  closes_at timestamptz not null,
  created_by uuid not null references members (id),
  created_at timestamptz not null default now(),
  -- The bet's message on Discord, refreshed at each stake.
  discord_channel_id text,
  discord_message_id text,
  constraint bets_title_not_blank check (length(btrim(title)) > 0)
);

create index bets_closes_at_idx on bets (closes_at);

create table bet_choices (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets (id) on delete cascade,
  position smallint not null check (position > 0),
  label text not null,
  unique (bet_id, position),
  unique (bet_id, label),
  -- Lets a stake's choice be checked against the stake's bet.
  unique (bet_id, id),
  constraint bet_choices_label_not_blank check (length(btrim(label)) > 0)
);

-- One stake per member and bet, on one of the bet's choices. Paid, it no longer changes.
create table stakes (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets (id) on delete cascade,
  member_id uuid not null references members (id),
  choice_id uuid not null,
  amount integer not null check (amount >= 1),
  placed_at timestamptz not null,
  paid_at timestamptz,
  paid_by uuid references members (id),
  unique (bet_id, member_id),
  foreign key (bet_id, choice_id) references bet_choices (bet_id, id),
  constraint stakes_paid_by_treasurer check ((paid_at is null) = (paid_by is null))
);

create index stakes_member_id_idx on stakes (member_id);

alter table bets enable row level security;
alter table bet_choices enable row level security;
alter table stakes enable row level security;
