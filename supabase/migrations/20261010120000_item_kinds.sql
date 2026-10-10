-- What the game says of an item of the raids (VXV_Raid reads it in game, VXV-OBJETS-1): its class, its subclass and
-- its equip slot, from which the website knows who may equip it. Unknown until an addon read it; then kept.
alter table items
  add column item_class smallint check (item_class >= 0),
  add column item_subclass smallint check (item_subclass >= 0),
  add column equip_slot text check (equip_slot ~ '^[A-Z0-9_]*$'),
  add constraint items_kind_whole check (num_nulls(item_class, item_subclass, equip_slot) in (0, 3));
