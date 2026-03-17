create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_unit_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  unit_id uuid not null,
  role text not null check (role in ('admin', 'attendant', 'cashier')),
  created_at timestamptz not null default now(),
  unique (user_id, unit_id, role)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  name text not null,
  email text not null,
  phone text not null,
  cpf text,
  cnpj text,
  category text not null check (category in ('agreement', 'monthly')),
  is_vip boolean not null default false,
  included_spots integer not null default 1,
  vip_spots integer not null default 0,
  monthly_fee numeric(10,2) not null default 0,
  billing_due_day integer not null default 1,
  billing_due_date date not null default current_date,
  total_visits integer not null default 0,
  total_spent numeric(10,2) not null default 0,
  cashback numeric(10,2) not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.client_vehicles (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  client_id uuid not null references public.clients (id) on delete cascade,
  plate text not null,
  driver_name text,
  model text,
  created_at timestamptz not null default now(),
  unique (client_id, plate)
);

create table if not exists public.parking_spots (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  code text not null,
  floor integer not null,
  section text not null,
  type text not null check (type in ('regular', 'vip', 'accessible', 'electric', 'motorcycle')),
  status text not null check (status in ('available', 'occupied', 'maintenance', 'blocked')),
  observations text,
  sort_order integer,
  vehicle_id uuid,
  created_at timestamptz not null default now(),
  unique (unit_id, code)
);

create table if not exists public.vehicle_stays (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  linked_client_id uuid references public.clients (id) on delete set null,
  parking_spot_id uuid references public.parking_spots (id) on delete set null,
  attendant_id uuid references public.profiles (id) on delete set null,
  plate text not null,
  brand text not null default '',
  model text not null default '',
  color text not null default '',
  year integer not null default extract(year from now()),
  status text not null check (status in ('parked', 'requested', 'in_transit', 'delivered', 'reserved')),
  entry_time timestamptz not null default now(),
  requested_at timestamptz,
  exit_time timestamptz,
  client_name text not null,
  driver_name text,
  client_phone text,
  observations text,
  photos jsonb,
  fuel_level integer,
  mileage integer,
  contract_type text not null default 'hourly' check (contract_type in ('hourly', 'daily', 'monthly', 'agreement')),
  unit_name text,
  inspection jsonb,
  pricing_snapshot jsonb,
  prepaid_paid boolean not null default false,
  recurring_client_category text check (recurring_client_category in ('agreement', 'monthly')),
  billing_status_at_entry text check (billing_status_at_entry in ('current', 'overdue')),
  vip_required boolean not null default false,
  exempt_from_charge boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null,
  vehicle_stay_id uuid not null references public.vehicle_stays (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  amount numeric(10,2) not null default 0,
  payment_method text not null check (payment_method in ('pix', 'credit', 'debit', 'cash', 'monthly')),
  status text not null check (status in ('pending', 'completed', 'failed', 'refunded')),
  receipt_number text not null,
  duration_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.current_user_unit_ids()
returns setof uuid
language sql
stable
as $$
  select uur.unit_id
  from public.user_unit_roles as uur
  where uur.user_id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.user_unit_roles enable row level security;
alter table public.clients enable row level security;
alter table public.client_vehicles enable row level security;
alter table public.parking_spots enable row level security;
alter table public.vehicle_stays enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_self_or_same_unit"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.user_unit_roles uur
    where uur.user_id = profiles.id
      and uur.unit_id in (select public.current_user_unit_ids())
  )
);

create policy "user_unit_roles_select_same_user"
on public.user_unit_roles
for select
using (
  user_id = auth.uid()
  or unit_id in (select public.current_user_unit_ids())
);

create policy "clients_same_unit"
on public.clients
for all
using (unit_id in (select public.current_user_unit_ids()))
with check (unit_id in (select public.current_user_unit_ids()));

create policy "client_vehicles_same_unit"
on public.client_vehicles
for all
using (unit_id in (select public.current_user_unit_ids()))
with check (unit_id in (select public.current_user_unit_ids()));

create policy "parking_spots_same_unit"
on public.parking_spots
for all
using (unit_id in (select public.current_user_unit_ids()))
with check (unit_id in (select public.current_user_unit_ids()));

create policy "vehicle_stays_same_unit"
on public.vehicle_stays
for all
using (unit_id in (select public.current_user_unit_ids()))
with check (unit_id in (select public.current_user_unit_ids()));

create policy "transactions_same_unit"
on public.transactions
for all
using (unit_id in (select public.current_user_unit_ids()))
with check (unit_id in (select public.current_user_unit_ids()));

create or replace view public.dashboard_stats_view as
select
  count(*) filter (where vs.status = 'parked') as total_vehicles,
  count(*) filter (where ps.status = 'available') as available_spots,
  coalesce(round((count(*) filter (where ps.status = 'occupied')::numeric / nullif(count(ps.*), 0)) * 100), 0) as occupancy_rate,
  coalesce(sum(t.amount) filter (where t.status = 'completed' and t.created_at::date = current_date), 0) as today_revenue,
  coalesce(avg(extract(epoch from (coalesce(vs.exit_time, now()) - vs.entry_time)) / 60) filter (where vs.status in ('parked', 'delivered')), 0) as avg_stay_duration,
  count(distinct uur.user_id) filter (where uur.role = 'attendant') as active_attendants,
  count(*) filter (where vs.status in ('requested', 'in_transit')) as vehicles_waiting,
  coalesce(avg(extract(epoch from (now() - vs.requested_at)) / 60) filter (where vs.status in ('requested', 'in_transit') and vs.requested_at is not null), 0) as avg_wait_time
from public.user_unit_roles uur
left join public.parking_spots ps on ps.unit_id = uur.unit_id
left join public.vehicle_stays vs on vs.unit_id = uur.unit_id
left join public.transactions t on t.unit_id = uur.unit_id
where uur.user_id = auth.uid();

create or replace view public.revenue_daily_view as
select
  date(created_at) as date,
  to_char(date(created_at), 'DD/MM') as date_label,
  coalesce(sum(amount), 0) as revenue,
  count(*) as transactions
from public.transactions
where unit_id in (select public.current_user_unit_ids())
group by date(created_at)
order by date(created_at);

create or replace view public.occupancy_hourly_view as
select
  to_char(generate_series, 'HH24:00') as hour,
  0::numeric as occupancy
from generate_series(
  date_trunc('day', now()),
  date_trunc('day', now()) + interval '23 hour',
  interval '1 hour'
);

create or replace view public.activity_feed_view as
select
  vs.id,
  case
    when vs.status = 'delivered' then 'exit'
    when vs.status in ('requested', 'in_transit') then 'request'
    else 'entry'
  end as type,
  concat('Veiculo ', vs.plate) as title,
  concat(vs.client_name, ' - ', coalesce(vs.model, '')) as description,
  to_char(vs.entry_time, 'HH24:MI') as time_label,
  vs.plate
from public.vehicle_stays vs
where vs.unit_id in (select public.current_user_unit_ids())
order by vs.entry_time desc;

create or replace view public.attendants_view as
select
  p.id,
  p.full_name,
  p.phone,
  p.avatar_url,
  uur.unit_id as parking_id,
  'Unidade'::text as parking_name,
  uur.role,
  'offline'::text as status,
  false as is_online,
  0 as vehicles_handled,
  0 as vehicles_handled_today,
  0 as avg_service_time,
  5 as rating,
  null::uuid as current_vehicle_id,
  'morning'::text as shift,
  '08:00'::text as work_period_start,
  '17:00'::text as work_period_end,
  8 as max_work_hours,
  null::timestamptz as started_at,
  0 as accumulated_work_minutes
from public.profiles p
join public.user_unit_roles uur on uur.user_id = p.id
where uur.unit_id in (select public.current_user_unit_ids())
  and uur.role = 'attendant';

create or replace function public.request_vehicle_pickup(p_stay_id uuid)
returns public.vehicle_stays
language plpgsql
security definer
as $$
declare
  updated_row public.vehicle_stays;
begin
  update public.vehicle_stays
  set status = 'requested',
      requested_at = now()
  where id = p_stay_id
    and unit_id in (select public.current_user_unit_ids())
  returning * into updated_row;

  return updated_row;
end;
$$;

create or replace function public.move_vehicle_spot(p_stay_id uuid, p_parking_spot_id uuid)
returns public.vehicle_stays
language plpgsql
security definer
as $$
declare
  updated_row public.vehicle_stays;
begin
  update public.vehicle_stays
  set parking_spot_id = p_parking_spot_id
  where id = p_stay_id
    and unit_id in (select public.current_user_unit_ids())
  returning * into updated_row;

  return updated_row;
end;
$$;

create or replace function public.register_vehicle_exit(p_stay_id uuid, p_payment_method text)
returns public.vehicle_stays
language plpgsql
security definer
as $$
declare
  updated_row public.vehicle_stays;
  stay_duration integer;
begin
  update public.vehicle_stays
  set status = 'delivered',
      exit_time = now()
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
    completed_at
  )
  values (
    updated_row.unit_id,
    updated_row.id,
    updated_row.linked_client_id,
    0,
    p_payment_method,
    'completed',
    'REC-' || to_char(now(), 'YYYYMMDDHH24MISS'),
    stay_duration,
    now()
  );

  return updated_row;
end;
$$;

create or replace function public.charge_client_subscription(p_client_id uuid, p_payment_method text)
returns void
language plpgsql
security definer
as $$
declare
  current_client public.clients;
begin
  select * into current_client
  from public.clients
  where id = p_client_id
    and unit_id in (select public.current_user_unit_ids());

  insert into public.transactions (
    unit_id,
    vehicle_stay_id,
    client_id,
    amount,
    payment_method,
    status,
    receipt_number,
    duration_minutes,
    completed_at
  )
  values (
    current_client.unit_id,
    (select id from public.vehicle_stays where linked_client_id = current_client.id order by created_at desc limit 1),
    current_client.id,
    current_client.monthly_fee,
    p_payment_method,
    'completed',
    'CLI-' || to_char(now(), 'YYYYMMDDHH24MISS'),
    0,
    now()
  );

  update public.clients
  set billing_due_date = current_date + interval '30 day',
      total_spent = total_spent + current_client.monthly_fee
  where id = p_client_id;
end;
$$;

create or replace function public.assign_vehicle_task(p_attendant_id uuid, p_stay_id uuid)
returns public.profiles
language plpgsql
security definer
as $$
declare
  updated_profile public.profiles;
begin
  update public.vehicle_stays
  set attendant_id = p_attendant_id,
      status = 'in_transit'
  where id = p_stay_id
    and unit_id in (select public.current_user_unit_ids());

  select * into updated_profile
  from public.profiles
  where id = p_attendant_id;

  return updated_profile;
end;
$$;

create or replace function public.upsert_parking_spot(
  p_id uuid,
  p_code text,
  p_floor integer,
  p_section text,
  p_type text,
  p_status text,
  p_observations text
)
returns public.parking_spots
language plpgsql
security definer
as $$
declare
  current_unit_id uuid;
  result_row public.parking_spots;
begin
  select unit_id into current_unit_id
  from public.user_unit_roles
  where user_id = auth.uid()
  limit 1;

  if p_id is null then
    insert into public.parking_spots (unit_id, code, floor, section, type, status, observations)
    values (current_unit_id, p_code, p_floor, p_section, p_type, p_status, p_observations)
    returning * into result_row;
  else
    update public.parking_spots
    set code = p_code,
        floor = p_floor,
        section = p_section,
        type = p_type,
        status = p_status,
        observations = p_observations
    where id = p_id
      and unit_id in (select public.current_user_unit_ids())
    returning * into result_row;
  end if;

  return result_row;
end;
$$;

create or replace function public.move_parking_spot(
  p_spot_id uuid,
  p_floor integer,
  p_section text,
  p_sort_order integer
)
returns public.parking_spots
language plpgsql
security definer
as $$
declare
  result_row public.parking_spots;
begin
  update public.parking_spots
  set floor = p_floor,
      section = p_section,
      sort_order = coalesce(p_sort_order, sort_order)
  where id = p_spot_id
    and unit_id in (select public.current_user_unit_ids())
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.create_parking_floor(
  p_floor integer,
  p_total_spots integer,
  p_spot_categories text[],
  p_section_layout jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  return;
end;
$$;

create or replace function public.delete_parking_floor(p_floor integer)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.parking_spots
  where floor = p_floor
    and unit_id in (select public.current_user_unit_ids());
end;
$$;

create or replace function public.invite_attendant_to_unit(
  p_name text,
  p_phone text,
  p_work_period_start text,
  p_work_period_end text,
  p_max_work_hours integer
)
returns public.profiles
language plpgsql
security definer
as $$
declare
  result_row public.profiles;
begin
  select * into result_row
  from public.profiles
  where id = auth.uid();
  return result_row;
end;
$$;
