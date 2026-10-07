-- An event is reserved to the holders of a Discord role, chosen by the officer who creates it (owner's request of
-- 7 October): only they may sign up. Without a role, as the events created before, everybody on the guild's Discord
-- server may. The role's name is kept as it was at the creation, to show it without asking Discord.
alter table events add column role_id text, add column role_name text;
alter table events add constraint events_role_named check ((role_id is null) = (role_name is null));
