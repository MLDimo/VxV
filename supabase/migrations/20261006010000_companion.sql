-- The companion app (P7) acts for a member with a token of its own, linked from the website. As for the sessions,
-- only SHA-256 hashes are stored: a database leak exposes neither a token nor a link code.

-- A link code lives a few minutes: the website hands it to the companion, which exchanges it for a token by proving
-- that it started the link (PKCE: the challenge is the hash of a secret only the companion knows).
create table companion_codes (
  id text primary key,
  member_id uuid not null references members (id) on delete cascade,
  challenge text not null,
  expires_at timestamptz not null
);

create index companion_codes_member_id_idx on companion_codes (member_id);

-- A token stays valid while the companion keeps using it. The member's roles are read again from Discord when they
-- were checked too long ago, so that a demoted officer or a member who left loses their rights.
create table companion_tokens (
  id text primary key,
  member_id uuid not null references members (id) on delete cascade,
  expires_at timestamptz not null,
  roles_checked_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index companion_tokens_member_id_idx on companion_tokens (member_id);

alter table companion_codes enable row level security;
alter table companion_tokens enable row level security;
