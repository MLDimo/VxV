-- The sign-up message the bot publishes on Discord for each event, kept up to date with the sign-ups.

alter table events add column discord_message_id text;
