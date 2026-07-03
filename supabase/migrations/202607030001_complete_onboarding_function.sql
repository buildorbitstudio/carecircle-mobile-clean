-- Atomically creates the initial CareCircle household after authentication.

begin;

create or replace function public.complete_onboarding(
  p_full_name text,
  p_family_name text,
  p_elder_full_name text,
  p_elder_date_of_birth date default null,
  p_primary_doctor text default null,
  p_pharmacy text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  new_family_id uuid;
  new_elder_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_full_name)) < 2 then
    raise exception 'Full name must contain at least 2 characters';
  end if;

  if char_length(trim(p_family_name)) < 2 then
    raise exception 'Family name must contain at least 2 characters';
  end if;

  if char_length(trim(p_elder_full_name)) < 2 then
    raise exception 'Elder name must contain at least 2 characters';
  end if;

  if p_elder_date_of_birth is not null and p_elder_date_of_birth > current_date then
    raise exception 'Date of birth cannot be in the future';
  end if;

  if exists (
    select 1
    from public.family_members fm
    where fm.user_id = current_user_id
      and fm.status = 'active'
  ) then
    raise exception 'Onboarding has already been completed';
  end if;

  select au.email
  into current_user_email
  from auth.users au
  where au.id = current_user_id;

  insert into public.users_profile (id, full_name, email)
  values (
    current_user_id,
    trim(p_full_name),
    coalesce(current_user_email, current_user_id::text || '@pending.local')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  insert into public.families (name, created_by)
  values (trim(p_family_name), current_user_id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role, status)
  values (new_family_id, current_user_id, 'admin', 'active');

  insert into public.elder_profiles (
    family_id,
    full_name,
    date_of_birth,
    primary_doctor,
    pharmacy,
    created_by
  )
  values (
    new_family_id,
    trim(p_elder_full_name),
    p_elder_date_of_birth,
    nullif(trim(p_primary_doctor), ''),
    nullif(trim(p_pharmacy), ''),
    current_user_id
  )
  returning id into new_elder_id;

  return jsonb_build_object(
    'family_id', new_family_id,
    'elder_profile_id', new_elder_id
  );
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, date, text, text)
from public;

grant execute on function public.complete_onboarding(text, text, text, date, text, text)
to authenticated;

commit;
