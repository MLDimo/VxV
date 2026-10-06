-- Results of the bets (P11.5), the treasurer's validations (P11.6) and the guild's cash (P11.9).

-- A bet ends once: an officer declares its winning choice, or cancels it (every stake is given back).
alter table bets
  add column winning_choice_id uuid,
  add column cancelled_at timestamptz,
  add column ended_at timestamptz,
  add constraint bets_winning_choice_fkey foreign key (id, winning_choice_id) references bet_choices (bet_id, id),
  add constraint bets_one_ending check (winning_choice_id is null or cancelled_at is null),
  add constraint bets_ended_with_outcome
    check ((ended_at is null) = (winning_choice_id is null and cancelled_at is null));

-- What each stake brought back once its bet ended, and when the treasurer handed it to the member.
create type stake_outcome as enum ('won', 'lost', 'refunded');

alter table stakes
  add column outcome stake_outcome,
  add column gain integer check (gain >= 0),
  add column collected_at timestamptz,
  add column collected_by uuid references members (id),
  add constraint stakes_gain_with_outcome check ((outcome is null) = (gain is null)),
  add constraint stakes_collected_by_treasurer check ((collected_at is null) = (collected_by is null)),
  add constraint stakes_collected_after_outcome check (collected_at is null or outcome in ('won', 'refunded'));

-- The guild's cash: every movement, entries positive and exits negative, with its reason. Nothing is ever changed
-- or removed: a mistake is corrected by another movement.
create type cash_movement_kind as enum ('bet_share', 'donation', 'expense', 'reward');

create table cash_movements (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null,
  kind cash_movement_kind not null,
  amount integer not null,
  label text not null,
  reason text not null,
  recorded_by uuid not null references members (id),
  -- The bet whose result brought the organisation's share.
  bet_id uuid references bets (id),
  -- The member who gave, for a donation.
  member_id uuid references members (id),
  constraint cash_movements_label_not_blank check (length(btrim(label)) > 0),
  constraint cash_movements_reason_not_blank check (length(btrim(reason)) > 0),
  constraint cash_movements_sign check (
    case kind when 'bet_share' then amount > 0 when 'donation' then amount > 0 else amount < 0 end
  ),
  constraint cash_movements_bet_share check ((kind = 'bet_share') = (bet_id is not null))
);

create function cash_movements_reject_change() returns trigger
language plpgsql as $$
begin
  raise exception 'cash_movements is append-only: % is not allowed', tg_op;
end;
$$;

create trigger cash_movements_append_only
  before update or delete on cash_movements
  for each row execute function cash_movements_reject_change();

create trigger cash_movements_no_truncate
  before truncate on cash_movements
  for each statement execute function cash_movements_reject_change();

alter table cash_movements enable row level security;
