create or replace function public.create_parking_floor(
  p_floor integer,
  p_total_spots integer,
  p_spot_categories text[],
  p_section_layout jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_unit_id uuid;
  section_item jsonb;
  section_name text;
  section_capacity integer;
  section_spot_number integer;
  global_spot_number integer := 1;
  category text;
begin
  if p_total_spots is null or p_total_spots <= 0 then
    raise exception 'Informe uma quantidade de vagas maior que zero.';
  end if;

  current_unit_id := public.current_user_primary_unit_id();

  if current_unit_id is null then
    raise exception 'Nenhuma unidade encontrada para o usuario autenticado.';
  end if;

  if exists (
    select 1
    from public.parking_spots
    where unit_id = current_unit_id
      and floor = p_floor
  ) then
    raise exception 'Ja existe um piso com este numero na unidade atual.';
  end if;

  if p_section_layout is null or jsonb_typeof(p_section_layout) <> 'array' or jsonb_array_length(p_section_layout) = 0 then
    raise exception 'Configure ao menos uma secao para criar o piso.';
  end if;

  for section_item in select * from jsonb_array_elements(p_section_layout)
  loop
    section_name := coalesce(nullif(trim(section_item ->> 'name'), ''), 'A');
    section_capacity := greatest(coalesce((section_item ->> 'capacity')::integer, 0), 0);
    section_spot_number := 1;

    while section_spot_number <= section_capacity and global_spot_number <= p_total_spots loop
      category := coalesce(p_spot_categories[global_spot_number], 'regular');

      insert into public.parking_spots (
        unit_id,
        code,
        floor,
        section,
        type,
        status,
        sort_order
      )
      values (
        current_unit_id,
        concat('P', p_floor, '-', section_name, '-', lpad(section_spot_number::text, 2, '0')),
        p_floor,
        section_name,
        case
          when category = 'vip' then 'vip'
          when category = 'electric' then 'electric'
          when category = 'accessible' then 'accessible'
          else 'regular'
        end,
        case
          when category = 'maintenance' then 'maintenance'
          else 'available'
        end,
        section_spot_number
      );

      section_spot_number := section_spot_number + 1;
      global_spot_number := global_spot_number + 1;
    end loop;

    exit when global_spot_number > p_total_spots;
  end loop;

  if global_spot_number <= p_total_spots then
    raise exception 'As secoes configuradas nao comportam todas as vagas informadas.';
  end if;
end;
$$;
