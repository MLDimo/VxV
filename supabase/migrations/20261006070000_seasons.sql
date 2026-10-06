-- Seasons (P11.7): an officer starts a new season, recorded in the journal; the rankings by season count the bets
-- ended since its start.
create table seasons (
  number integer primary key check (number > 0),
  started_at timestamptz not null,
  started_by uuid not null references members (id)
);

alter table seasons enable row level security;
