-- Stakes made in game (P11.8): a change may be about a bet instead of an event. Its answer goes back to the game
-- with the bets' data.
alter table game_changes
  add column bet_id uuid references bets (id) on delete cascade,
  add constraint game_changes_one_scope check (event_id is null or bet_id is null);

create index game_changes_bet_id_idx on game_changes (bet_id);
