-- CareCircle task assignment authorization.
-- Uses existing care_tasks, family_members, and users_profile tables. Safe to rerun.

begin;

create or replace function public.create_care_task(
  p_family_id uuid,
  p_elder_profile_id uuid,
  p_title text,
  p_description text,
  p_assigned_to uuid,
  p_due_date timestamptz,
  p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_task public.care_tasks;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not private.is_family_member(p_family_id) then
    raise exception 'You do not have access to this family circle';
  end if;

  if not exists (
    select 1
    from public.elder_profiles ep
    where ep.id = p_elder_profile_id
      and ep.family_id = p_family_id
  ) then
    raise exception 'Elder profile does not belong to this family circle';
  end if;

  if p_assigned_to is not null and not private.is_family_admin(p_family_id) then
    raise exception 'Only a family admin can assign tasks to a specific family member';
  end if;

  if p_assigned_to is not null and not exists (
    select 1
    from public.family_members fm
    where fm.family_id = p_family_id
      and fm.user_id = p_assigned_to
      and fm.status = 'active'
  ) then
    raise exception 'Assigned user is not an active family member';
  end if;

  if char_length(trim(p_title)) not between 1 and 200 then
    raise exception 'Task title must contain between 1 and 200 characters';
  end if;

  if p_due_date is null then
    raise exception 'Due date is required';
  end if;

  if p_priority not in ('low', 'medium', 'high') then
    raise exception 'Unsupported task priority';
  end if;

  insert into public.care_tasks (
    family_id,
    elder_profile_id,
    title,
    description,
    assigned_to,
    due_date,
    priority,
    status,
    created_by
  )
  values (
    p_family_id,
    p_elder_profile_id,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_assigned_to,
    p_due_date,
    p_priority,
    case when p_due_date < now() then 'overdue' else 'pending' end,
    current_user_id
  )
  returning * into new_task;

  return to_jsonb(new_task);
end;
$$;

revoke all on function public.create_care_task(uuid, uuid, text, text, uuid, timestamptz, text)
from public;

grant execute on function public.create_care_task(uuid, uuid, text, text, uuid, timestamptz, text)
to authenticated;

commit;
