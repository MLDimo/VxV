-- Characters present at each raid event, recorded by the addon from P6 on. With the soft reserves and the
-- loots of previous events, it gives the SR+ bonus, which is computed and never stored (decisions of 3 October).

create table event_attendance (
  event_id uuid not null references events (id),
  character_id uuid not null references characters (id),
  primary key (event_id, character_id)
);

alter table event_attendance enable row level security;
