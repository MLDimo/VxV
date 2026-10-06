-- The artisans directory (P14): each character's professions as the addon read them in game, and the recipes they
-- know. A reading replaces an older one of the same character and profession, never a newer one.

-- A character's profession: its level when the addon read it (each login), and when its recipes were read (when
-- the player opens the profession's window; never yet for a profession only seen in the list).
create table professions (
  character_id uuid not null references characters (id) on delete cascade,
  -- The game's skill line (182 Herboristerie, 129 Secourisme…).
  profession_id integer not null check (profession_id > 0),
  name text not null,
  skill_level integer not null check (skill_level >= 0),
  max_level integer not null check (max_level >= 0),
  read_at timestamptz not null,
  recipes_read_at timestamptz,
  -- The member whose companion sent it: the character's own, or an officer relaying it.
  sent_by uuid not null references members (id),
  primary key (character_id, profession_id),
  constraint professions_name_not_blank check (length(btrim(name)) > 0)
);

-- The recipes the guild knows, by the game's id, with their name as the game wrote it.
create table recipes (
  id integer primary key check (id > 0),
  profession_id integer not null check (profession_id > 0),
  name text not null,
  constraint recipes_name_not_blank check (length(btrim(name)) > 0)
);

-- The recipes a character knows, with the profession they were read in.
create table known_recipes (
  character_id uuid not null,
  profession_id integer not null,
  recipe_id integer not null references recipes (id),
  primary key (character_id, profession_id, recipe_id),
  foreign key (character_id, profession_id) references professions (character_id, profession_id) on delete cascade
);

create index known_recipes_recipe_id_idx on known_recipes (recipe_id);

alter table professions enable row level security;
alter table recipes enable row level security;
alter table known_recipes enable row level security;
