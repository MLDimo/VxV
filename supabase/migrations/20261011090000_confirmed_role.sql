-- The guild's Discord role « Membre » (decision of 10 October): only its holders bet and play deathrolls, so that a
-- newcomer brings no gold from RMT into the guild's games.
alter type member_role add value 'confirmed' after 'member';
