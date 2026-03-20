alter table public.clients
  alter column unit_id set default public.current_user_primary_unit_id();

alter table public.client_vehicles
  alter column unit_id set default public.current_user_primary_unit_id();
