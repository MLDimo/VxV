-- Website sessions. The cookie holds a random token; only its SHA-256 hash is stored,
-- so a database leak does not expose usable sessions.

create table sessions (
  id text primary key,
  member_id uuid not null references members (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_member_id_idx on sessions (member_id);

alter table sessions enable row level security;
