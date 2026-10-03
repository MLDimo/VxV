-- When the bot reminded the guild of an event on Discord, so that each event is reminded only once.

alter table events add column reminded_at timestamptz;
