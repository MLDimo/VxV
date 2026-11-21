-- A raid night may go without soft reserve (owner's request of 21 November, for UBRS): every item is then rolled
-- freely, or given by the loot council when excluded.
alter table events drop constraint events_kind_fields;
alter table events add constraint events_kind_fields check (
  (kind = 'raid' and title is null and soft_reserves_per_player >= 0)
  or (kind = 'pvp' and title is not null and length(btrim(title)) > 0 and soft_reserves_per_player = 0)
);
