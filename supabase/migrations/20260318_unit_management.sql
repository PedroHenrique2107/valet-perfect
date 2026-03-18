create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

insert into public.units (id, name, location, created_by)
select distinct uur.unit_id, 'Unidade principal'::text, null::text, coalesce(auth.uid(), uur.user_id)
from public.user_unit_roles uur
where not exists (
  select 1
  from public.units u
  where u.id = uur.unit_id
);

alter table public.user_unit_roles drop constraint if exists user_unit_roles_role_check;
alter table public.user_unit_roles
  add constraint user_unit_roles_role_check
  check (role in ('admin', 'leader', 'attendant', 'cashier'));

create table if not exists public.unit_invitations (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('leader', 'attendant', 'cashier')),
  status text not null default 'pending' check (status in ('pending', 'linked', 'cancelled')),
  work_period_start text not null default '08:00',
  work_period_end text not null default '17:00',
  max_work_hours integer not null default 8,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.units enable row level security;
alter table public.unit_invitations enable row level security;

create policy "units_same_user_or_unit"
on public.units
for select
using (
  id in (select public.current_user_unit_ids())
  or created_by = auth.uid()
);

create policy "units_insert_authenticated"
on public.units
for insert
with check (created_by = auth.uid());

create policy "unit_invitations_same_unit"
on public.unit_invitations
for select
using (unit_id in (select public.current_user_unit_ids()));

create or replace view public.unit_members_view as
select
  uur.user_id,
  uur.unit_id,
  uur.role,
  uur.created_at,
  p.full_name,
  p.email,
  p.phone,
  u.name as unit_name,
  u.location as unit_location
from public.user_unit_roles uur
join public.profiles p on p.id = uur.user_id
left join public.units u on u.id = uur.unit_id
where uur.unit_id in (select public.current_user_unit_ids());

create or replace function public.current_user_primary_unit_id()
returns uuid
language sql
stable
as $$
  select uur.unit_id
  from public.user_unit_roles uur
  where uur.user_id = auth.uid()
  order by uur.created_at asc
  limit 1
$$;

create or replace function public.create_unit(
  p_name text,
  p_location text default null
)
returns public.units
language plpgsql
security definer
as $$
declare
  new_unit public.units;
begin
  insert into public.units (name, location, created_by)
  values (p_name, p_location, auth.uid())
  returning * into new_unit;

  insert into public.user_unit_roles (user_id, unit_id, role)
  values (auth.uid(), new_unit.id, 'admin')
  on conflict (user_id, unit_id, role) do nothing;

  return new_unit;
end;
$$;

create or replace function public.create_unit_invitation(
  p_name text,
  p_email text,
  p_phone text default null,
  p_role text default 'attendant',
  p_unit_id uuid default null,
  p_work_period_start text default '08:00',
  p_work_period_end text default '17:00',
  p_max_work_hours integer default 8
)
returns public.unit_invitations
language plpgsql
security definer
as $$
declare
  target_unit_id uuid;
  existing_profile public.profiles;
  new_invitation public.unit_invitations;
begin
  target_unit_id := coalesce(p_unit_id, public.current_user_primary_unit_id());

  if target_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  if target_unit_id not in (select public.current_user_unit_ids()) then
    raise exception 'Voce nao possui acesso a esta unidade.';
  end if;

  select *
  into existing_profile
  from public.profiles
  where lower(email) = lower(p_email)
  limit 1;

  insert into public.unit_invitations (
    unit_id,
    name,
    email,
    phone,
    role,
    status,
    work_period_start,
    work_period_end,
    max_work_hours
  )
  values (
    target_unit_id,
    p_name,
    p_email,
    p_phone,
    p_role,
    case when existing_profile.id is null then 'pending' else 'linked' end,
    p_work_period_start,
    p_work_period_end,
    p_max_work_hours
  )
  returning * into new_invitation;

  if existing_profile.id is not null then
    insert into public.user_unit_roles (user_id, unit_id, role)
    values (existing_profile.id, target_unit_id, p_role)
    on conflict (user_id, unit_id, role) do nothing;
  end if;

  return new_invitation;
end;
$$;

create or replace function public.update_unit_member_role(
  p_user_id uuid,
  p_unit_id uuid,
  p_role text
)
returns public.user_unit_roles
language plpgsql
security definer
as $$
declare
  result_row public.user_unit_roles;
begin
  if p_unit_id not in (select public.current_user_unit_ids()) then
    raise exception 'Voce nao possui acesso a esta unidade.';
  end if;

  delete from public.user_unit_roles
  where user_id = p_user_id
    and unit_id = p_unit_id;

  insert into public.user_unit_roles (user_id, unit_id, role)
  values (p_user_id, p_unit_id, p_role)
  returning * into result_row;

  return result_row;
end;
$$;

create or replace function public.remove_unit_member(
  p_user_id uuid,
  p_unit_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  if p_unit_id not in (select public.current_user_unit_ids()) then
    raise exception 'Voce nao possui acesso a esta unidade.';
  end if;

  delete from public.user_unit_roles
  where user_id = p_user_id
    and unit_id = p_unit_id
    and role <> 'admin';
end;
$$;

create or replace function public.purge_unit_operational_data(
  p_delete_clients boolean default true,
  p_delete_attendants boolean default true,
  p_delete_vehicles boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  current_unit_id uuid;
  deleted_transactions integer := 0;
  deleted_vehicle_stays integer := 0;
  deleted_clients integer := 0;
  deleted_roles integer := 0;
  deleted_invitations integer := 0;
begin
  current_unit_id := public.current_user_primary_unit_id();

  if current_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  if p_delete_vehicles then
    delete from public.transactions
    where unit_id = current_unit_id;
    get diagnostics deleted_transactions = row_count;

    update public.parking_spots
    set vehicle_id = null,
        status = case when status = 'occupied' then 'available' else status end
    where unit_id = current_unit_id;

    delete from public.vehicle_stays
    where unit_id = current_unit_id;
    get diagnostics deleted_vehicle_stays = row_count;
  end if;

  if p_delete_clients then
    delete from public.clients
    where unit_id = current_unit_id;
    get diagnostics deleted_clients = row_count;
  end if;

  if p_delete_attendants then
    delete from public.user_unit_roles
    where unit_id = current_unit_id
      and role = 'attendant';
    get diagnostics deleted_roles = row_count;

    delete from public.unit_invitations
    where unit_id = current_unit_id
      and role = 'attendant';
    get diagnostics deleted_invitations = row_count;
  end if;

  return jsonb_build_object(
    'unitId', current_unit_id,
    'deletedTransactions', deleted_transactions,
    'deletedVehicles', deleted_vehicle_stays,
    'deletedClients', deleted_clients,
    'deletedAttendantRoles', deleted_roles,
    'deletedAttendantInvitations', deleted_invitations
  );
end;
$$;
