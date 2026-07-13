-- CareCircle individual account support.
-- Uses existing family/member/elder/care tables. Safe to rerun.

begin;

alter table public.families
  add column if not exists is_personal boolean not null default false;

alter table public.elder_profiles
  add column if not exists relationship text;

alter table public.elder_profiles
  add column if not exists phone text;

alter table public.elder_profiles
  add column if not exists address text;

create index if not exists families_created_by_personal_idx
  on public.families(created_by, is_personal);

create unique index if not exists families_one_personal_circle_per_user_idx
  on public.families(created_by)
  where is_personal = true;

drop function if exists public.ensure_personal_care_profile();
drop function if exists public.complete_individual_onboarding(text, date, text, text, text, text, text, text, text);
drop function if exists public.complete_onboarding(text, text, text, date, text, text);

create or replace function public.ensure_personal_care_profile()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  current_name text;
  target_family public.families;
  target_elder public.elder_profiles;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    lower(trim(u.email)),
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1))
  into current_email, current_name
  from auth.users u
  where u.id = current_user_id;

  insert into public.users_profile (id, full_name, email)
  values (current_user_id, current_name, current_email)
  on conflict (id) do update
  set
    full_name = coalesce(nullif(public.users_profile.full_name, ''), excluded.full_name),
    email = excluded.email;

  select *
  into target_family
  from public.families f
  where f.created_by = current_user_id
    and f.is_personal = true
  order by f.created_at asc
  limit 1;

  if not found then
    insert into public.families (name, created_by, is_personal)
    values (current_name || '''s Personal Care', current_user_id, true)
    returning * into target_family;
  end if;

  insert into public.family_members (family_id, user_id, role, status)
  values (target_family.id, current_user_id, 'admin', 'active')
  on conflict (family_id, user_id) do update
  set role = 'admin', status = 'active';

  select *
  into target_elder
  from public.elder_profiles ep
  where ep.family_id = target_family.id
    and ep.user_id = current_user_id
  order by ep.created_at asc
  limit 1;

  if not found then
    insert into public.elder_profiles (
      family_id,
      user_id,
      full_name,
      relationship,
      created_by
    )
    values (
      target_family.id,
      current_user_id,
      current_name,
      'Self',
      current_user_id
    )
    returning * into target_elder;
  end if;

  return jsonb_build_object(
    'family_id', target_family.id,
    'elder_profile_id', target_elder.id,
    'role', 'admin'
  );
end;
$$;

create or replace function public.complete_individual_onboarding(
  p_full_name text,
  p_date_of_birth date,
  p_phone text,
  p_address text,
  p_primary_doctor text,
  p_pharmacy text,
  p_emergency_contact_name text,
  p_emergency_contact_relationship text,
  p_emergency_contact_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text;
  personal_family public.families;
  personal_elder public.elder_profiles;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(p_full_name)) not between 2 and 120 then
    raise exception 'Enter your full name';
  end if;

  select lower(trim(u.email))
  into normalized_email
  from auth.users u
  where u.id = current_user_id;

  insert into public.users_profile (id, full_name, email)
  values (current_user_id, trim(p_full_name), normalized_email)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  insert into public.families (name, created_by, is_personal)
  values (trim(p_full_name) || '''s Personal Care', current_user_id, true)
  on conflict (created_by) where is_personal = true do update
  set name = excluded.name
  returning * into personal_family;

  insert into public.family_members (family_id, user_id, role, status)
  values (personal_family.id, current_user_id, 'admin', 'active')
  on conflict (family_id, user_id) do update
  set role = 'admin', status = 'active';

  insert into public.elder_profiles (
    family_id,
    user_id,
    full_name,
    date_of_birth,
    relationship,
    phone,
    address,
    primary_doctor,
    pharmacy,
    created_by
  )
  values (
    personal_family.id,
    current_user_id,
    trim(p_full_name),
    p_date_of_birth,
    'Self',
    nullif(trim(p_phone), ''),
    nullif(trim(p_address), ''),
    nullif(trim(p_primary_doctor), ''),
    nullif(trim(p_pharmacy), ''),
    current_user_id
  )
  on conflict (family_id, user_id) do update
  set
    full_name = excluded.full_name,
    date_of_birth = excluded.date_of_birth,
    relationship = 'Self',
    phone = excluded.phone,
    address = excluded.address,
    primary_doctor = excluded.primary_doctor,
    pharmacy = excluded.pharmacy
  returning * into personal_elder;

  if nullif(trim(p_emergency_contact_name), '') is not null
    and nullif(trim(p_emergency_contact_phone), '') is not null then
    insert into public.emergency_contacts (
      elder_profile_id,
      name,
      relationship,
      phone,
      priority
    )
    values (
      personal_elder.id,
      trim(p_emergency_contact_name),
      nullif(trim(p_emergency_contact_relationship), ''),
      trim(p_emergency_contact_phone),
      1
    );
  end if;

  return jsonb_build_object(
    'family_id', personal_family.id,
    'elder_profile_id', personal_elder.id,
    'role', 'admin'
  );
end;
$$;

create or replace function public.complete_onboarding(
  p_full_name text,
  p_family_name text,
  p_elder_full_name text,
  p_elder_date_of_birth date,
  p_primary_doctor text,
  p_pharmacy text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text;
  new_family public.families;
  new_elder public.elder_profiles;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.family_members fm
    join public.families f on f.id = fm.family_id
    where fm.user_id = current_user_id
      and fm.status = 'active'
      and f.is_personal = false
  ) then
    raise exception 'You already belong to a family circle';
  end if;

  select lower(trim(u.email))
  into normalized_email
  from auth.users u
  where u.id = current_user_id;

  insert into public.users_profile (id, full_name, email)
  values (current_user_id, trim(p_full_name), normalized_email)
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  insert into public.families (name, created_by, is_personal)
  values (trim(p_family_name), current_user_id, false)
  returning * into new_family;

  insert into public.family_members (family_id, user_id, role, status)
  values (new_family.id, current_user_id, 'admin', 'active');

  insert into public.elder_profiles (
    family_id,
    full_name,
    date_of_birth,
    primary_doctor,
    pharmacy,
    created_by
  )
  values (
    new_family.id,
    trim(p_elder_full_name),
    p_elder_date_of_birth,
    nullif(trim(p_primary_doctor), ''),
    nullif(trim(p_pharmacy), ''),
    current_user_id
  )
  returning * into new_elder;

  return jsonb_build_object(
    'family_id', new_family.id,
    'elder_profile_id', new_elder.id,
    'role', 'admin'
  );
end;
$$;

revoke all on function public.ensure_personal_care_profile() from public;
revoke all on function public.complete_individual_onboarding(text, date, text, text, text, text, text, text, text)
from public;
revoke all on function public.complete_onboarding(text, text, text, date, text, text)
from public;

grant execute on function public.ensure_personal_care_profile() to authenticated;
grant execute on function public.complete_individual_onboarding(text, date, text, text, text, text, text, text, text)
to authenticated;
grant execute on function public.complete_onboarding(text, text, text, date, text, text)
to authenticated;

commit;
