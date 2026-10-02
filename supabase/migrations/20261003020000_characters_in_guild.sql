-- Whether the character is currently in the guild, according to the latest roster import.
-- Characters who leave stay in the database: their history and links are kept.

alter table characters add column in_guild boolean not null default true;
