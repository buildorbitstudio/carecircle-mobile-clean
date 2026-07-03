-- Family care task creation, overdue refresh, completion, and realtime.

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

create or replace function public.refresh_overdue_care_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  affected_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.care_tasks ct
  set status = 'overdue'
  where ct.status = 'pending'
    and ct.due_date < now()
    and exists (
      select 1
      from public.family_members fm
      where fm.family_id = ct.family_id
        and fm.user_id = current_user_id
        and fm.status = 'active'
    );

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.complete_care_task(p_task_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_task public.care_tasks;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_task
  from public.care_tasks ct
  where ct.id = p_task_id
  for update;

  if not found then
    raise exception 'Care task not found';
  end if;

  if not private.is_family_member(target_task.family_id) then
    raise exception 'You do not have access to this care task';
  end if;

  if target_task.status = 'completed' then
    return to_jsonb(target_task);
  end if;

  update public.care_tasks
  set
    status = 'completed',
    completed_at = now()
  where id = target_task.id
  returning * into target_task;

  insert into public.health_timeline_events (
    family_id,
    elder_profile_id,
    event_type,
    title,
    description,
    severity,
    created_by,
    source_table,
    source_id
  )
  values (
    target_task.family_id,
    target_task.elder_profile_id,
    'task_completed',
    'Care task completed',
    target_task.title,
    'normal',
    current_user_id,
    'care_tasks',
    target_task.id
  );

  return to_jsonb(target_task);
end;
$$;

revoke all on function public.create_care_task(uuid, uuid, text, text, uuid, timestamptz, text)
from public;
revoke all on function public.refresh_overdue_care_tasks() from public;
revoke all on function public.complete_care_task(uuid) from public;

grant execute on function public.create_care_task(uuid, uuid, text, text, uuid, timestamptz, text)
to authenticated;
grant execute on function public.refresh_overdue_care_tasks() to authenticated;
grant execute on function public.complete_care_task(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'care_tasks'
  ) then
    alter publication supabase_realtime add table public.care_tasks;
  end if;
end;
$$;

commit;
