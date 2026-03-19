create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  attendant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_amount numeric(10,2) not null default 0,
  closing_amount numeric(10,2),
  expected_amount numeric(10,2),
  difference_amount numeric(10,2),
  total_entries integer not null default 0,
  total_exits integer not null default 0,
  total_revenue numeric(10,2) not null default 0,
  total_transactions integer not null default 0,
  opening_notes text,
  closing_notes text,
  report jsonb,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vehicle_stays
  add column if not exists entry_cash_session_id uuid references public.cash_sessions (id) on delete set null;

alter table public.vehicle_stays
  add column if not exists exit_cash_session_id uuid references public.cash_sessions (id) on delete set null;

alter table public.transactions
  add column if not exists cash_session_id uuid references public.cash_sessions (id) on delete set null;

create index if not exists cash_sessions_unit_status_idx
  on public.cash_sessions (unit_id, status, opened_at desc);

create index if not exists vehicle_stays_entry_cash_session_idx
  on public.vehicle_stays (entry_cash_session_id);

create index if not exists vehicle_stays_exit_cash_session_idx
  on public.vehicle_stays (exit_cash_session_id);

create index if not exists transactions_cash_session_idx
  on public.transactions (cash_session_id);

alter table public.cash_sessions enable row level security;

drop policy if exists "cash_sessions_same_unit" on public.cash_sessions;
create policy "cash_sessions_same_unit"
on public.cash_sessions
for select
using (unit_id in (select public.current_user_unit_ids()));

create or replace function public.current_open_cash_session_id(
  p_unit_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_unit_id uuid;
  session_id uuid;
begin
  target_unit_id := coalesce(p_unit_id, public.current_user_primary_unit_id());

  if target_unit_id is null then
    return null;
  end if;

  select cs.id
  into session_id
  from public.cash_sessions cs
  where cs.unit_id = target_unit_id
    and cs.status = 'open'
  order by cs.opened_at desc
  limit 1;

  return session_id;
end;
$$;

create or replace function public.open_cash_session(
  p_opening_amount numeric default 0,
  p_opening_notes text default null
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_unit_id uuid;
  existing_session_id uuid;
  result_row public.cash_sessions;
begin
  target_unit_id := public.current_user_primary_unit_id();

  if target_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  existing_session_id := public.current_open_cash_session_id(target_unit_id);

  if existing_session_id is not null then
    raise exception 'Ja existe um caixa aberto para esta unidade.';
  end if;

  insert into public.cash_sessions (
    unit_id,
    attendant_id,
    status,
    opening_amount,
    opening_notes
  )
  values (
    target_unit_id,
    auth.uid(),
    'open',
    coalesce(p_opening_amount, 0),
    nullif(trim(coalesce(p_opening_notes, '')), '')
  )
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.close_current_cash_session(
  p_closing_amount numeric default 0,
  p_closing_notes text default null
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  target_unit_id uuid;
  active_session public.cash_sessions;
  can_close boolean;
  computed_entries integer := 0;
  computed_exits integer := 0;
  computed_revenue numeric(10,2) := 0;
  computed_transactions integer := 0;
  expected_cash numeric(10,2) := 0;
  difference_cash numeric(10,2) := 0;
  report_payload jsonb := '{}'::jsonb;
begin
  target_unit_id := public.current_user_primary_unit_id();

  if target_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  select *
  into active_session
  from public.cash_sessions cs
  where cs.unit_id = target_unit_id
    and cs.status = 'open'
  order by cs.opened_at desc
  limit 1;

  if active_session.id is null then
    raise exception 'Nao existe caixa aberto para fechar.';
  end if;

  select exists (
    select 1
    from public.user_unit_roles uur
    where uur.user_id = auth.uid()
      and uur.unit_id = target_unit_id
      and uur.role in ('admin', 'leader', 'cashier')
  ) or active_session.attendant_id = auth.uid()
  into can_close;

  if not can_close then
    raise exception 'Voce nao possui permissao para fechar este caixa.';
  end if;

  select count(*)
  into computed_entries
  from public.vehicle_stays vs
  where vs.entry_cash_session_id = active_session.id;

  select count(*)
  into computed_exits
  from public.vehicle_stays vs
  where vs.exit_cash_session_id = active_session.id;

  select
    coalesce(sum(t.amount), 0),
    count(*)
  into computed_revenue, computed_transactions
  from public.transactions t
  where t.cash_session_id = active_session.id
    and t.status = 'completed';

  expected_cash := coalesce(active_session.opening_amount, 0) + coalesce(computed_revenue, 0);
  difference_cash := coalesce(p_closing_amount, 0) - expected_cash;

  select jsonb_build_object(
    'entries',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stayId', vs.id,
          'plate', vs.plate,
          'clientName', vs.client_name,
          'driverName', vs.driver_name,
          'entryTime', vs.entry_time,
          'spotId', vs.parking_spot_id
        )
        order by vs.entry_time asc
      )
      from public.vehicle_stays vs
      where vs.entry_cash_session_id = active_session.id
    ), '[]'::jsonb),
    'exits',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stayId', vs.id,
          'plate', vs.plate,
          'clientName', vs.client_name,
          'driverName', vs.driver_name,
          'exitTime', vs.exit_time
        )
        order by vs.exit_time asc
      )
      from public.vehicle_stays vs
      where vs.exit_cash_session_id = active_session.id
    ), '[]'::jsonb),
    'transactions',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'transactionId', t.id,
          'receiptNumber', t.receipt_number,
          'paymentMethod', t.payment_method,
          'status', t.status,
          'amount', t.amount,
          'createdAt', t.created_at,
          'completedAt', t.completed_at
        )
        order by t.created_at asc
      )
      from public.transactions t
      where t.cash_session_id = active_session.id
    ), '[]'::jsonb),
    'paymentBreakdown',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'paymentMethod', payment_method,
          'amount', amount,
          'count', item_count
        )
        order by payment_method
      )
      from (
        select
          t.payment_method,
          coalesce(sum(t.amount), 0) as amount,
          count(*) as item_count
        from public.transactions t
        where t.cash_session_id = active_session.id
          and t.status = 'completed'
        group by t.payment_method
      ) grouped
    ), '[]'::jsonb),
    'summary',
    jsonb_build_object(
      'openingAmount', coalesce(active_session.opening_amount, 0),
      'closingAmount', coalesce(p_closing_amount, 0),
      'expectedAmount', expected_cash,
      'differenceAmount', difference_cash,
      'totalEntries', computed_entries,
      'totalExits', computed_exits,
      'totalRevenue', computed_revenue,
      'totalTransactions', computed_transactions
    )
  )
  into report_payload;

  update public.cash_sessions
  set status = 'closed',
      closed_at = now(),
      closing_amount = coalesce(p_closing_amount, 0),
      expected_amount = expected_cash,
      difference_amount = difference_cash,
      total_entries = computed_entries,
      total_exits = computed_exits,
      total_revenue = computed_revenue,
      total_transactions = computed_transactions,
      closing_notes = nullif(trim(coalesce(p_closing_notes, '')), ''),
      report = report_payload
  where id = active_session.id
  returning * into active_session;

  return active_session;
end;
$$;

create or replace function public.attach_open_cash_session_to_vehicle_stay()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_unit_id uuid;
  active_cash_session_id uuid;
begin
  target_unit_id := coalesce(new.unit_id, public.current_user_primary_unit_id());

  if target_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  active_cash_session_id := public.current_open_cash_session_id(target_unit_id);

  if active_cash_session_id is null then
    raise exception 'Nao existe caixa aberto para registrar novas entradas.';
  end if;

  new.unit_id := target_unit_id;
  new.entry_cash_session_id := coalesce(new.entry_cash_session_id, active_cash_session_id);
  new.attendant_id := coalesce(new.attendant_id, auth.uid());

  return new;
end;
$$;

drop trigger if exists attach_open_cash_session_to_vehicle_stay on public.vehicle_stays;
create trigger attach_open_cash_session_to_vehicle_stay
before insert on public.vehicle_stays
for each row
execute function public.attach_open_cash_session_to_vehicle_stay();

create or replace function public.attach_open_cash_session_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_unit_id uuid;
  active_cash_session_id uuid;
begin
  target_unit_id := new.unit_id;

  if target_unit_id is null then
    raise exception 'Nao foi possivel identificar a unidade do caixa.';
  end if;

  active_cash_session_id := public.current_open_cash_session_id(target_unit_id);

  if active_cash_session_id is null then
    raise exception 'Nao existe caixa aberto para registrar pagamentos.';
  end if;

  new.cash_session_id := coalesce(new.cash_session_id, active_cash_session_id);
  return new;
end;
$$;

drop trigger if exists attach_open_cash_session_to_transaction on public.transactions;
create trigger attach_open_cash_session_to_transaction
before insert on public.transactions
for each row
execute function public.attach_open_cash_session_to_transaction();

drop function if exists public.register_vehicle_exit(uuid, text);
create function public.register_vehicle_exit(
  p_stay_id uuid,
  p_payment_method text,
  p_amount numeric default 0
)
returns public.vehicle_stays
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.vehicle_stays;
  stay_duration integer;
  active_cash_session_id uuid;
begin
  active_cash_session_id := public.current_open_cash_session_id();

  if active_cash_session_id is null then
    raise exception 'Nao existe caixa aberto para registrar saidas.';
  end if;

  update public.vehicle_stays
  set status = 'delivered',
      exit_time = now(),
      exit_cash_session_id = active_cash_session_id
  where id = p_stay_id
    and unit_id in (select public.current_user_unit_ids())
  returning * into updated_row;

  stay_duration := greatest(1, extract(epoch from (coalesce(updated_row.exit_time, now()) - updated_row.entry_time))::integer / 60);

  insert into public.transactions (
    unit_id,
    vehicle_stay_id,
    client_id,
    amount,
    payment_method,
    status,
    receipt_number,
    duration_minutes,
    completed_at,
    cash_session_id
  )
  values (
    updated_row.unit_id,
    updated_row.id,
    updated_row.linked_client_id,
    coalesce(p_amount, 0),
    p_payment_method,
    'completed',
    'REC-' || to_char(now(), 'YYYYMMDDHH24MISS'),
    stay_duration,
    now(),
    active_cash_session_id
  );

  return updated_row;
end;
$$;

create or replace view public.cash_sessions_view as
select
  cs.*,
  coalesce(p.full_name, p.email, 'Usuario') as attendant_name
from public.cash_sessions cs
left join public.profiles p on p.id = cs.attendant_id
where cs.unit_id in (select public.current_user_unit_ids());
