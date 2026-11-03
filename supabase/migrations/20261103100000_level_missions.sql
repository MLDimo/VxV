-- Two kinds of quests on the characters' level (owner's request of 3 November): the levels gained, and the race to
-- level 60, read by the addon like the other counters.
alter type mission_type add value 'levels';
alter type mission_type add value 'level60';
