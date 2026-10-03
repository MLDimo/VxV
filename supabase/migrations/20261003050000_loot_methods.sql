-- Every loot records how it was given (decisions of 3 October): soft reserve, soft reserve with its
-- bonus (SR+), free roll or loot council. Existing loots, if any, are taken as soft-reserve loots.

create type loot_method as enum ('soft_reserve', 'soft_reserve_plus', 'free_roll', 'loot_council');

alter table loots add column method loot_method not null default 'soft_reserve';
alter table loots alter column method drop default;
