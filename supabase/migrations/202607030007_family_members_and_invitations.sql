-- MVP family invitations and protected role management.

begin;

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null check (char_length(trim(email)) between 3 and 320),
  role text not null check (role in ('admin', 'member', 'elder')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references public.users_profile(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists family_invitations_pending_email_idx
  on public.family_invitations(family_id, lower(email))
  where status = 'pending';

create index if not exists family_invitations_family_status_idx
  on public.family_invitations(family_id, status, created_at desc);

drop trigger if exists family_invitations_set_updated_at
on public.family_invitations;
create trigger family_invitations_set_updated_at
before update on public.family_invitations
for each row execute function public.set_updated_at();

alter table public.family_invitations enable row level security;
grant select, insert, update, delete on public.family_invitations to authenticated;

drop policy if exists "family_invitations_select_admins" on public.family_invitations;
create policy "family_invitations_select_admins"
on public.family_invitations for select to authenticated
using (private.is_family_admin(family_id));

drop policy if exists "family_invitations_insert_admins" on public.family_invitations;
create policy "family_invitations_insert_admins"
on public.family_invitations for insert to authenticated
with check (
  private.is_family_admin(family_id)
  and invited_by = (select auth.uid())
);

drop policy if exists "family_invitations_update_admins" on public.family_invitations;
create policy "family_invitations_update_admins"
on public.family_invitations for update to authenticated
using (private.is_family_admin(family_id))
with check (private.is_family_admin(family_id));

drop policy if exists "family_invitations_delete_admins" on public.family_invitations;
create policy "family_invitations_delete_admins"
on public.family_invitations for delete to authenticated
using (private.is_family_admin(family_id));

create or replace function public.create_family_invitation(
  p_family_id uuid,
  p_email text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(p_email));
  new_invitation public.family_invitations;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_family_admin(p_family_id) then
    raise exception 'Only a family admin can invite members';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  if p_role not in ('admin', 'member', 'elder') then
    raise exception 'Unsupported family role';
  end if;

  if exists (
    select 1
    from public.family_members fm
    join public.users_profile up on up.id = fm.user_id
    where fm.family_id = p_family_id
      and fm.status = 'active'
      and lower(up.email) = normalized_email
  ) then
    raise exception 'This person is already an active family member';
  end if;

  update public.family_invitations
  set status = 'revoked'
  where family_id = p_family_id
    and lower(email) = normalized_email
    and status = 'pending';

  insert into public.family_invitations (
    family_id,
    email,
    role,
    status,
    invited_by
  )
  values (
    p_family_id,
    normalized_email,
    p_role,
    'pending',
    current_user_id
  )
  returning * into new_invitation;

  return to_jsonb(new_invitation);
end;
$$;

create or replace function public.update_family_member_role(
  p_membership_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_membership public.family_members;
  updated_membership public.family_members;
  active_admin_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_role not in ('admin', 'member', 'elder') then
    raise exception 'Unsupported family role';
  end if;

  select *
  into target_membership
  from public.family_members fm
  where fm.id = p_membership_id
  for update;

  if not found then
    raise exception 'Family member not found';
  end if;

  if not private.is_family_admin(target_membership.family_id) then
    raise exception 'Only a family admin can change roles';
  end if;

  if target_membership.role = 'admin' and p_role <> 'admin' then
    select count(*)
    into active_admin_count
    from public.family_members fm
    where fm.family_id = target_membership.family_id
      and fm.status = 'active'
      and fm.role = 'admin';

    if active_admin_count <= 1 then
      raise exception 'A family circle must keep at least one admin';
    end if;
  end if;

  update public.family_members
  set role = p_role
  where id = target_membership.id
  returning * into updated_membership;

  return to_jsonb(updated_membership);
end;
$$;

create or replace function public.update_family_invitation_role(
  p_invitation_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invitation public.family_invitations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_role not in ('admin', 'member', 'elder') then
    raise exception 'Unsupported family role';
  end if;

  select *
  into target_invitation
  from public.family_invitations fi
  where fi.id = p_invitation_id
    and fi.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending invitation not found';
  end if;

  if not private.is_family_admin(target_invitation.family_id) then
    raise exception 'Only a family admin can change invitation roles';
  end if;

  update public.family_invitations
  set role = p_role
  where id = target_invitation.id
  returning * into target_invitation;

  return to_jsonb(target_invitation);
end;
$$;

revoke all on function public.create_family_invitation(uuid, text, text) from public;
revoke all on function public.update_family_member_role(uuid, text) from public;
revoke all on function public.update_family_invitation_role(uuid, text) from public;

grant execute on function public.create_family_invitation(uuid, text, text) to authenticated;
grant execute on function public.update_family_member_role(uuid, text) to authenticated;
grant execute on function public.update_family_invitation_role(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'family_members'
  ) then
    alter publication supabase_realtime add table public.family_members;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'family_invitations'
  ) then
    alter publication supabase_realtime add table public.family_invitations;
  end if;
end;
$$;

commit;
