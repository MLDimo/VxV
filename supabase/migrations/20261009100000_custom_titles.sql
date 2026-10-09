-- Titles made by hand (owner's request of 9 October): an officer names a title and gives it to a member, with the
-- reason shown with it, until the next Wednesday's reset or for an undetermined time, until an officer takes it back.
-- An ended title keeps its row, with when it ended.
create table custom_titles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reason text not null,
  member_id uuid not null references members (id),
  until_reset boolean not null,
  given_at timestamptz not null,
  ended_at timestamptz,
  constraint custom_titles_name check (length(btrim(name)) between 1 and 40),
  constraint custom_titles_reason check (length(btrim(reason)) > 0),
  constraint custom_titles_ended check (ended_at is null or ended_at >= given_at)
);

-- A member holds a title of a name once at a time.
create unique index custom_titles_held on custom_titles (member_id, lower(name)) where ended_at is null;

alter table custom_titles enable row level security;
