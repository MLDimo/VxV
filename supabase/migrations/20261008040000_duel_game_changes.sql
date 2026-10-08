-- The changes made in game about a duel (VXV_PvP): taking up or turning down a challenge, conceding, calling off, the
-- result read in game. Their answers go back to the game with the PvP data, by duel; a change is about one event, one
-- bet or one duel at most.
alter table game_changes add column duel_id uuid references duels (id) on delete cascade;
alter table game_changes drop constraint game_changes_one_scope;
alter table game_changes add constraint game_changes_one_scope check (num_nonnulls(event_id, bet_id, duel_id) <= 1);

create index game_changes_duel_id_idx on game_changes (duel_id);
