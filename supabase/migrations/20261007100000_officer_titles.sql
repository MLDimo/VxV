-- The titles the game does not measure (Princesse, owner's decision of 7 October): an officer gives them for the week,
-- without a score. Like the others, they go to nobody at the next Wednesday's reassignment.
alter table title_awards alter column score drop not null;
