-- The deathroll (owner's rule of 8 October): each roll from 0 to the previous result, and the first to roll 0 loses.
alter table deathroll_rolls drop constraint deathroll_rolls_in_range;
alter table deathroll_rolls add constraint deathroll_rolls_in_range check (result between 0 and high);
