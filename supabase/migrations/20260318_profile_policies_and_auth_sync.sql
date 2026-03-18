create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.handle_auth_user_synced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      avatar_url = excluded.avatar_url;

  insert into public.user_unit_roles (user_id, unit_id, role)
  select
    new.id,
    invitation.unit_id,
    invitation.role
  from public.unit_invitations as invitation
  where lower(invitation.email) = lower(new.email)
  on conflict (user_id, unit_id, role) do nothing;

  update public.unit_invitations
  set status = 'linked'
  where lower(email) = lower(new.email)
    and status = 'pending';

  return new;
end;
$$;

drop trigger if exists on_auth_user_synced on auth.users;

create trigger on_auth_user_synced
after insert or update on auth.users
for each row
execute function public.handle_auth_user_synced();
