-- Events created in game (P9.2): the answer to such a change belongs to no event yet.
alter table game_changes alter column event_id drop not null;

-- When a sign-up's soft reserves last changed (P9.4): with signups.updated_at, it lets the latest change win, made
-- on the website, on Discord or in game. A change made in game carries the time it was made.
alter table signups add column reserves_updated_at timestamptz;
