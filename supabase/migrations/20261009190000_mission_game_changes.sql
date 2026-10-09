-- A quest an officer publishes in game (VXV_Missions): its answer goes back to the game with the quests' data, by
-- mission; a change is about one event, one bet, one duel or one mission at most.
alter table game_changes add column mission_id uuid references missions (id) on delete cascade;
alter table game_changes drop constraint game_changes_one_scope;
alter table game_changes
  add constraint game_changes_one_scope check (num_nonnulls(event_id, bet_id, duel_id, mission_id) <= 1);

create index game_changes_mission_id_idx on game_changes (mission_id);
