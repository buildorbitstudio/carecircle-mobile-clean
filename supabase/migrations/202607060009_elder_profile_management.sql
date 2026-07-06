-- Admin-only elder profile management.
begin;

alter table public.elder_profiles add column if not exists relationship text;
alter table public.elder_profiles add column if not exists phone text;
alter table public.elder_profiles add column if not exists address text;

drop policy if exists "elder_profiles_update_members" on public.elder_profiles;
drop policy if exists "elder_profiles_update_admins" on public.elder_profiles;
create policy "elder_profiles_update_admins"
on public.elder_profiles for update to authenticated
using (private.is_family_admin(family_id))
with check (private.is_family_admin(family_id));

drop policy if exists "medical_conditions_insert_members" on public.medical_conditions;
drop policy if exists "medical_conditions_update_members" on public.medical_conditions;
drop policy if exists "medical_conditions_delete_members" on public.medical_conditions;
drop policy if exists "medical_conditions_insert_admins" on public.medical_conditions;
drop policy if exists "medical_conditions_update_admins" on public.medical_conditions;
drop policy if exists "medical_conditions_delete_admins" on public.medical_conditions;
create policy "medical_conditions_insert_admins" on public.medical_conditions
for insert to authenticated with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "medical_conditions_update_admins" on public.medical_conditions
for update to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
) with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "medical_conditions_delete_admins" on public.medical_conditions
for delete to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);

drop policy if exists "allergies_insert_members" on public.allergies;
drop policy if exists "allergies_update_members" on public.allergies;
drop policy if exists "allergies_delete_members" on public.allergies;
drop policy if exists "allergies_insert_admins" on public.allergies;
drop policy if exists "allergies_update_admins" on public.allergies;
drop policy if exists "allergies_delete_admins" on public.allergies;
create policy "allergies_insert_admins" on public.allergies
for insert to authenticated with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "allergies_update_admins" on public.allergies
for update to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
) with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "allergies_delete_admins" on public.allergies
for delete to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);

drop policy if exists "emergency_contacts_insert_members" on public.emergency_contacts;
drop policy if exists "emergency_contacts_update_members" on public.emergency_contacts;
drop policy if exists "emergency_contacts_delete_members" on public.emergency_contacts;
drop policy if exists "emergency_contacts_insert_admins" on public.emergency_contacts;
drop policy if exists "emergency_contacts_update_admins" on public.emergency_contacts;
drop policy if exists "emergency_contacts_delete_admins" on public.emergency_contacts;
create policy "emergency_contacts_insert_admins" on public.emergency_contacts
for insert to authenticated with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "emergency_contacts_update_admins" on public.emergency_contacts
for update to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
) with check (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);
create policy "emergency_contacts_delete_admins" on public.emergency_contacts
for delete to authenticated using (
  private.is_family_admin((select family_id from public.elder_profiles where id = elder_profile_id))
);

create or replace function public.save_elder_profile(
  p_elder_id uuid,
  p_full_name text,
  p_date_of_birth date,
  p_relationship text,
  p_phone text,
  p_address text,
  p_notes text,
  p_conditions text[],
  p_allergies text[],
  p_contact_name text,
  p_contact_relationship text,
  p_contact_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.elder_profiles;
  item text;
begin
  select * into target from public.elder_profiles where id = p_elder_id;
  if target.id is null or not private.is_family_admin(target.family_id) then
    raise exception 'Only a family administrator can edit this elder profile';
  end if;
  if char_length(trim(p_full_name)) < 2 then raise exception 'Enter the elder full name'; end if;

  update public.elder_profiles set
    full_name = trim(p_full_name), date_of_birth = p_date_of_birth,
    relationship = nullif(trim(p_relationship), ''), phone = nullif(trim(p_phone), ''),
    address = nullif(trim(p_address), ''), notes = nullif(trim(p_notes), '')
  where id = p_elder_id returning * into target;

  delete from public.medical_conditions where elder_profile_id = p_elder_id;
  foreach item in array coalesce(p_conditions, array[]::text[]) loop
    if trim(item) <> '' then
      insert into public.medical_conditions (elder_profile_id, condition_name) values (p_elder_id, trim(item));
    end if;
  end loop;

  delete from public.allergies where elder_profile_id = p_elder_id;
  foreach item in array coalesce(p_allergies, array[]::text[]) loop
    if trim(item) <> '' then
      insert into public.allergies (elder_profile_id, allergy_name, severity) values (p_elder_id, trim(item), 'unknown');
    end if;
  end loop;

  delete from public.emergency_contacts where elder_profile_id = p_elder_id and priority = 1;
  if nullif(trim(p_contact_name), '') is not null and nullif(trim(p_contact_phone), '') is not null then
    insert into public.emergency_contacts (elder_profile_id, name, relationship, phone, priority)
    values (p_elder_id, trim(p_contact_name), nullif(trim(p_contact_relationship), ''), trim(p_contact_phone), 1);
  end if;
  return to_jsonb(target);
end;
$$;

revoke all on function public.save_elder_profile(uuid,text,date,text,text,text,text,text[],text[],text,text,text) from public;
grant execute on function public.save_elder_profile(uuid,text,date,text,text,text,text,text[],text[],text,text,text) to authenticated;
commit;
