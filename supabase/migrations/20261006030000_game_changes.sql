-- Changes made in game (P7.5): sign-ups and soft reserves of the members, exclusions of the officers. The player's
-- companion, or an officer's that relays them, sends them; several may send the same change, applied once by its id.
-- What became of each goes back to the game with the event's data.
create table game_changes (
  id text primary key,
  event_id uuid not null references events (id) on delete cascade,
  -- The character who made the change in game, as "Prénom Nom".
  author text not null,
  accepted boolean not null,
  message text not null,
  -- The member whose companion sent it: the author's own, or an officer relaying it.
  sent_by uuid not null references members (id),
  received_at timestamptz not null default now()
);

create index game_changes_event_id_idx on game_changes (event_id);

alter table game_changes enable row level security;
