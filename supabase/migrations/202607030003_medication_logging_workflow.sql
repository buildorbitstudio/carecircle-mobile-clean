-- Atomic medication logging with health timeline integration.

begin;

create or replace function public.log_medication(
  p_medication_id uuid,
  p_status text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_medication public.medications;
  target_family_id uuid;
  new_log public.medication_logs;
  event_severity text := 'normal';
  event_title text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('taken', 'skipped', 'snoozed', 'missed', 'need_help') then
    raise exception 'Unsupported medication log status';
  end if;

  select m.*
  into target_medication
  from public.medications m
  where m.id = p_medication_id;

  if not found then
    raise exception 'Medication not found';
  end if;

  select ep.family_id
  into target_family_id
  from public.elder_profiles ep
  where ep.id = target_medication.elder_profile_id;

  if not private.is_family_member(target_family_id) then
    raise exception 'You do not have access to this medication';
  end if;

  if p_status = 'need_help' then
    event_severity := 'urgent';
    event_title := 'Help needed with medication';
  elsif p_status in ('skipped', 'missed') then
    event_severity := 'warning';
    event_title := case
      when p_status = 'missed' then 'Medication missed'
      else 'Medication skipped'
    end;
  elsif p_status = 'snoozed' then
    event_title := 'Medication snoozed';
  else
    event_title := 'Medication taken';
  end if;

  insert into public.medication_logs (
    medication_id,
    elder_profile_id,
    status,
    response_source,
    logged_by,
    notes
  )
  values (
    target_medication.id,
    target_medication.elder_profile_id,
    p_status,
    'manual',
    current_user_id,
    nullif(trim(p_notes), '')
  )
  returning * into new_log;

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
    target_family_id,
    target_medication.elder_profile_id,
    'medication_log',
    event_title,
    target_medication.name || ' ' || target_medication.dosage ||
      case
        when nullif(trim(p_notes), '') is not null then ': ' || trim(p_notes)
        else ''
      end,
    event_severity,
    current_user_id,
    'medication_logs',
    new_log.id
  );

  return to_jsonb(new_log);
end;
$$;

revoke all on function public.log_medication(uuid, text, text) from public;
grant execute on function public.log_medication(uuid, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'medications'
  ) then
    alter publication supabase_realtime add table public.medications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'medication_logs'
  ) then
    alter publication supabase_realtime add table public.medication_logs;
  end if;
end;
$$;

commit;
