alter table public.transactions
  alter column vehicle_stay_id drop not null;

create or replace function public.charge_client_subscription(p_client_id uuid, p_payment_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_client public.clients;
  reference_stay_id uuid;
  next_due_date date;
  charge_amount numeric(10,2);
  receipt_prefix text;
  next_due_base date;
begin
  select *
  into current_client
  from public.clients
  where id = p_client_id
    and unit_id in (select public.current_user_unit_ids());

  if current_client.id is null then
    raise exception 'Cliente nao encontrado na unidade atual.';
  end if;

  charge_amount := coalesce(current_client.monthly_fee, 0);

  if charge_amount <= 0 then
    raise exception 'O valor da mensalidade do cliente precisa ser maior que zero para realizar a cobranca.';
  end if;

  select vs.id
  into reference_stay_id
  from public.vehicle_stays vs
  where vs.linked_client_id = current_client.id
    and vs.unit_id = current_client.unit_id
  order by coalesce(vs.exit_time, vs.entry_time, vs.created_at) desc
  limit 1;

  next_due_base := (current_client.billing_due_date + interval '1 month')::date;
  next_due_date := make_date(
    extract(year from next_due_base)::integer,
    extract(month from next_due_base)::integer,
    least(
      greatest(coalesce(current_client.billing_due_day, 1), 1),
      extract(day from ((date_trunc('month', next_due_base) + interval '1 month - 1 day')::date))::integer
    )
  );

  receipt_prefix := case
    when current_client.category = 'agreement' then 'AGR-'
    else 'CLI-'
  end;

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
    reference_stay_id,
    current_client.id,
    charge_amount,
    p_payment_method,
    'completed',
    receipt_prefix || to_char(now(), 'YYYYMMDDHH24MISS'),
    0,
    now()
  );

  update public.clients
  set billing_due_date = next_due_date,
      total_spent = total_spent + charge_amount
  where id = p_client_id;
end;
$$;
