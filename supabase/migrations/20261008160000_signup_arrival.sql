-- When each character first signed up to the event, kept through later changes: the order of arrival in which the
-- event's Discord message numbers its sign-ups. The sign-ups already made arrive at their last change.
alter table signups add column signed_up_at timestamptz;
update signups set signed_up_at = updated_at;
alter table signups alter column signed_up_at set not null, alter column signed_up_at set default now();
