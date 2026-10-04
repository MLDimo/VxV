-- Raid logs exported by the addon (P6). An import adds the gives it does not know yet: a give is one item, of
-- one boss, at one instant, whoever won it, so that a correction made on the website survives a new import.
create unique index loots_one_give on loots (event_id, encounter_id, item_id, looted_at);

-- The raid's recap is published on Discord once, at the first import of its log.
alter table events add column recap_posted_at timestamptz;
