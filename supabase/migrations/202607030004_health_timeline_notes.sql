-- Manual health notes and realtime timeline updates.

begin;

create or replace function public.add_manual_health_note(
  p_elder_profile_id uuid,
  p_title text,
  p_description text default null,
  p_severity text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_family_id uuid;
  new_event public.health_timeline_events;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select ep.family_id
  into target_family_id
  from public.elder_profiles ep
  where ep.id = p_elder_profile_id;

  if target_family_id is null then
    raise exception 'Elder profile not found';
  end if;

  if not private.is_family_member(target_family_id) then
    raise exception 'You do not have access to this elder profile';
  end if;

  if char_length(trim(p_title)) not between 1 and 200 then
    raise exception 'Note title must contain between 1 and 200 characters';
  end if;

  if p_severity not in ('normal', 'warning', 'urgent') then
    raise exception 'Unsupported severity';
  end if;

  insert into public.health_timeline_events (
    family_id,
    elder_profile_id,
    event_type,
    title,
    description,
    severity,
    created_by
  )
  values (
    target_family_id,
    p_elder_profile_id,
    'manual_health_note',
    trim(p_title),
    nullif(trim(p_description), ''),
    p_severity,
    current_user_id
  )
  returning * into new_event;

  return to_jsonb(new_event);
end;
$$;

revoke all on function public.add_manual_health_note(uuid, text, text, text) from public;
grant execute on function public.add_manual_health_note(uuid, text, text, text)
to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'health_timeline_events'
  ) then
    alter publication supabase_realtime add table public.health_timeline_events;
  end if;
end;
$$;

commit;
