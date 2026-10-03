-- One sign-up per member and event, whatever character they bring.

alter table signups add column member_id uuid not null references members (id);
alter table signups add constraint signups_one_per_member unique (event_id, member_id);
