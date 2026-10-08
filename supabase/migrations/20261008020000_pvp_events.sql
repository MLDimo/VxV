-- The guild's PvP outings (owner's request of 7 October) are events too, signed up like the raid nights, reserved to a
-- Discord role the same way: they have a title instead of raids, and no soft reserve since they have no loot.
alter table events add column kind text not null default 'raid', add column title text;
alter table events add constraint events_kind check (kind in ('raid', 'pvp'));
alter table events drop constraint events_soft_reserves_per_player_check;
alter table events add constraint events_kind_fields check (
  (kind = 'raid' and title is null and soft_reserves_per_player >= 1)
  or (kind = 'pvp' and title is not null and length(btrim(title)) > 0 and soft_reserves_per_player = 0)
);
