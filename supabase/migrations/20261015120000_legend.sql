-- The Hall of Fame (owner's request of 15 October): the guild's legend, a corridor of paintings, each the memory of an
-- evening (an exploit), in chapters the officers make. A member proposes an exploit with its captures; an officer
-- publishes it in a chapter with its rarity, or refuses it, the reason in the journal. The members say they were there
-- and leave a memory under it.
create table legend_chapters (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 60),
  period text not null default '' check (length(period) <= 40),
  created_by uuid not null references members (id),
  created_at timestamptz not null
);

create table legend_exploits (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 80),
  occurred_on date not null,
  occurred_time time,
  place text not null default '' check (length(place) <= 60),
  category text not null check (category in ('guilde', 'culte', 'exploit', 'pvp', 'raid')),
  story text not null check (length(btrim(story)) between 1 and 1500),
  quote text not null default '' check (length(quote) <= 160),
  quote_by text not null default '' check (length(quote_by) <= 40),
  stats text[] not null default '{}' check (cardinality(stats) <= 4),
  -- The raid night it happened during: its present players are the painting's.
  event_id uuid references events (id),
  proposed_by uuid not null references members (id),
  proposed_at timestamptz not null,
  status text not null default 'proposed' check (status in ('proposed', 'published', 'refused')),
  chapter_id uuid references legend_chapters (id),
  rarity text check (rarity in ('rare', 'epic', 'legendary')),
  mvp_id uuid references members (id),
  mvp_why text not null default '' check (length(mvp_why) <= 160),
  loot text not null default '' check (length(loot) <= 80),
  reviewed_by uuid references members (id),
  reviewed_at timestamptz,
  refusal text,
  constraint legend_exploits_published_in_a_chapter check (
    status <> 'published' or (chapter_id is not null and rarity is not null)
  )
);

create index legend_exploits_status_idx on legend_exploits (status, occurred_on);

-- The captures of an exploit: the first is its painting.
create table legend_images (
  id uuid primary key default gen_random_uuid(),
  exploit_id uuid not null references legend_exploits (id) on delete cascade,
  position smallint not null check (position between 1 and 4),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  bytes bytea not null check (octet_length(bytes) between 1 and 1572864),
  unique (exploit_id, position)
);

-- « J'y étais »: the members who say they were there.
create table legend_presences (
  exploit_id uuid not null references legend_exploits (id) on delete cascade,
  member_id uuid not null references members (id),
  declared_at timestamptz not null,
  primary key (exploit_id, member_id)
);

create table legend_comments (
  id uuid primary key default gen_random_uuid(),
  exploit_id uuid not null references legend_exploits (id) on delete cascade,
  member_id uuid not null references members (id),
  body text not null check (length(btrim(body)) between 1 and 500),
  written_at timestamptz not null
);

create index legend_comments_exploit_idx on legend_comments (exploit_id, written_at);

alter table legend_chapters enable row level security;
alter table legend_exploits enable row level security;
alter table legend_images enable row level security;
alter table legend_presences enable row level security;
alter table legend_comments enable row level security;
