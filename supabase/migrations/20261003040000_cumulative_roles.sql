-- Guild roles are cumulative: an officer can also be treasurer (decisions of 3 October).

alter table members add column roles member_role[] not null default '{member}';
update members set roles = array[role];
alter table members drop column role;
alter table members add constraint members_roles_not_empty check (cardinality(roles) > 0);
