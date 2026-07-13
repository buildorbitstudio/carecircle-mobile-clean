-- CareCircle shareable family invite links.
-- Safe to rerun in Supabase SQL Editor / Preview.

begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.family_invitations
  add column if not exists invite_token text;

update public.family_invitations
set invite_token = gen_random_uuid()::text
where invite_token is null;

alter table public.family_invitations
  alter column invite_token set default gen_random_uuid()::text;

alter table public.family_invitations
  alter column invite_token set not null;

create unique index if not exists family_invitations_invite_token_idx
  on public.family_invitations(invite_token);

create index if not exists family_invitations_token_status_idx
  on public.family_invitations(invite_token, status, expires_at);

create or replace function public.get_family_invitation_by_token(
  p_invite_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invitation public.family_invitations;
  target_family public.families;
begin
  if nullif(trim(p_invite_token), '') is null then
    raise exception 'Invitation link is missing';
  end if;

  select *
  into target_invitation
  from public.family_invitations fi
  where fi.invite_token = trim(p_invite_token)
  limit 1;

  if not found then
    raise exception 'Invitation link was not found';
  end if;

  if target_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer active';
  end if;

  if target_invitation.expires_at <= now() then
    update public.family_invitations
    set status = 'expired'
    where id = target_invitation.id
      and status = 'pending';

    raise exception 'This invitation has expired';
  end if;

  select *
  into target_family
  from public.families f
  where f.id = target_invitation.family_id;

  return jsonb_build_object(
    'id', target_invitation.id,
    'family_id', target_invitation.family_id,
    'family_name', target_family.name,
    'email', target_invitation.email,
    'role', target_invitation.role,
    'expires_at', target_invitation.expires_at
  );
end;
$$;

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
    invited_by,
    invite_token
  )
  values (
    p_family_id,
    normalized_email,
    p_role,
    'pending',
    current_user_id,
    gen_random_uuid()::text
  )
  returning * into new_invitation;

  return to_jsonb(new_invitation);
end;
$$;

create or replace function public.accept_family_invitation(
  p_invite_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  current_name text;
  target_invitation public.family_invitations;
  accepted_membership public.family_members;
  target_elder_profile_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in or create an account to accept this invitation';
  end if;

  if nullif(trim(p_invite_token), '') is null then
    raise exception 'Invitation link is missing';
  end if;

  select
    lower(trim(u.email)),
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
  into current_email, current_name
  from auth.users u
  where u.id = current_user_id;

  if current_email is null then
    raise exception 'Unable to verify your signed-in email address';
  end if;

  select *
  into target_invitation
  from public.family_invitations fi
  where fi.invite_token = trim(p_invite_token)
  for update;

  if not found then
    raise exception 'Invitation link was not found';
  end if;

  if target_invitation.status <> 'pending' then
    raise exception 'This invitation is no longer active';
  end if;

  if target_invitation.expires_at <= now() then
    update public.family_invitations
    set status = 'expired'
    where id = target_invitation.id;

    raise exception 'This invitation has expired';
  end if;

  if lower(target_invitation.email) <> current_email then
    raise exception 'This invitation was sent to %, but you are signed in as %',
      target_invitation.email,
      current_email;
  end if;

  insert into public.users_profile (id, full_name, email)
  values (current_user_id, current_name, current_email)
  on conflict (id) do update
  set
    full_name = coalesce(nullif(public.users_profile.full_name, ''), excluded.full_name),
    email = excluded.email;

  insert into public.family_members (
    family_id,
    user_id,
    role,
    status
  )
  values (
    target_invitation.family_id,
    current_user_id,
    target_invitation.role,
    'active'
  )
  on conflict (family_id, user_id) do update
  set
    role = excluded.role,
    status = 'active'
  returning * into accepted_membership;

  update public.family_invitations
  set status = 'accepted'
  where id = target_invitation.id;

  select ep.id
  into target_elder_profile_id
  from public.elder_profiles ep
  where ep.family_id = target_invitation.family_id
  order by ep.created_at asc
  limit 1;

  return jsonb_build_object(
    'family_id', accepted_membership.family_id,
    'membership_id', accepted_membership.id,
    'role', accepted_membership.role,
    'elder_profile_id', target_elder_profile_id
  );
end;
$$;

revoke all on function public.get_family_invitation_by_token(text) from public;
revoke all on function public.accept_family_invitation(text) from public;
revoke all on function public.create_family_invitation(uuid, text, text) from public;

grant execute on function public.get_family_invitation_by_token(text) to anon, authenticated;
grant execute on function public.accept_family_invitation(text) to authenticated;
grant execute on function public.create_family_invitation(uuid, text, text) to authenticated;

commit;
