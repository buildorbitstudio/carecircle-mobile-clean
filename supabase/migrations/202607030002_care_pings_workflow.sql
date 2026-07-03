-- Care Pings transactional workflow and realtime support.

begin;

create or replace function public.send_care_ping(
  p_family_id uuid,
  p_elder_profile_id uuid,
  p_ping_type text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_ping public.care_pings;
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

  if p_ping_type not in ('medication', 'wellness', 'hydration', 'meal', 'movement', 'custom') then
    raise exception 'Unsupported Care Ping type';
  end if;

  if char_length(trim(p_message)) not between 1 and 500 then
    raise exception 'Care Ping message must contain between 1 and 500 characters';
  end if;

  insert into public.care_pings (
    family_id,
    elder_profile_id,
    sender_id,
    ping_type,
    message,
    status,
    urgency,
    expires_at
  )
  values (
    p_family_id,
    p_elder_profile_id,
    current_user_id,
    p_ping_type,
    trim(p_message),
    'sent',
    'normal',
    now() + interval '30 minutes'
  )
  returning * into new_ping;

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
    p_family_id,
    p_elder_profile_id,
    'care_ping_sent',
    'Care Ping sent',
    trim(p_message),
    'normal',
    current_user_id,
    'care_pings',
    new_ping.id
  );

  return to_jsonb(new_ping);
end;
$$;

create or replace function public.respond_to_care_ping(
  p_ping_id uuid,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  target_ping public.care_pings;
  normalized_response text := trim(p_response);
  response_urgency text := 'normal';
  response_severity text := 'normal';
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into target_ping
  from public.care_pings cp
  where cp.id = p_ping_id
  for update;

  if not found then
    raise exception 'Care Ping not found';
  end if;

  if not private.is_family_member(target_ping.family_id) then
    raise exception 'You do not have access to this Care Ping';
  end if;

  if target_ping.status <> 'sent' then
    raise exception 'This Care Ping has already been closed';
  end if;

  if target_ping.ping_type = 'medication'
     and normalized_response not in ('Taken', 'Remind Me Later', 'Need Help') then
    raise exception 'Invalid medication response';
  elsif target_ping.ping_type = 'wellness'
     and normalized_response not in ('Good', 'Okay', 'Not Feeling Well', 'Need Help') then
    raise exception 'Invalid wellness response';
  elsif target_ping.ping_type in ('hydration', 'meal', 'movement')
     and normalized_response not in ('Done', 'Later', 'Need Help') then
    raise exception 'Invalid Care Ping response';
  elsif target_ping.ping_type = 'custom'
     and normalized_response not in ('Done', 'Later', 'Need Help') then
    raise exception 'Invalid custom response';
  end if;

  if normalized_response = 'Need Help' then
    response_urgency := 'urgent';
    response_severity := 'urgent';
  elsif normalized_response = 'Not Feeling Well' then
    response_urgency := 'warning';
    response_severity := 'warning';
  end if;

  update public.care_pings
  set
    status = 'responded',
    response = normalized_response,
    urgency = response_urgency,
    responded_at = now(),
    remind_at = case
      when normalized_response in ('Remind Me Later', 'Later') then now() + interval '15 minutes'
      else null
    end
  where id = target_ping.id
  returning * into target_ping;

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
    target_ping.family_id,
    target_ping.elder_profile_id,
    'care_ping_response',
    case
      when response_severity = 'urgent' then 'Urgent Care Ping response'
      when response_severity = 'warning' then 'Wellness response needs attention'
      else 'Care Ping answered'
    end,
    normalized_response || ': ' || target_ping.message,
    response_severity,
    current_user_id,
    'care_pings',
    target_ping.id
  );

  return to_jsonb(target_ping);
end;
$$;

create or replace function public.refresh_unanswered_care_pings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  affected_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  with expired as (
    update public.care_pings cp
    set
      status = 'unanswered',
      urgency = 'warning'
    where cp.status = 'sent'
      and cp.expires_at <= now()
      and exists (
        select 1
        from public.family_members fm
        where fm.family_id = cp.family_id
          and fm.user_id = current_user_id
          and fm.status = 'active'
      )
    returning cp.*
  ),
  timeline_rows as (
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
    select
      expired.family_id,
      expired.elder_profile_id,
      'care_ping_unanswered',
      'Care Ping unanswered',
      expired.message,
      'warning',
      null,
      'care_pings',
      expired.id
    from expired
    returning id
  )
  select count(*)::integer
  into affected_count
  from timeline_rows;

  return affected_count;
end;
$$;

revoke all on function public.send_care_ping(uuid, uuid, text, text) from public;
revoke all on function public.respond_to_care_ping(uuid, text) from public;
revoke all on function public.refresh_unanswered_care_pings() from public;

grant execute on function public.send_care_ping(uuid, uuid, text, text) to authenticated;
grant execute on function public.respond_to_care_ping(uuid, text) to authenticated;
grant execute on function public.refresh_unanswered_care_pings() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'care_pings'
  ) then
    alter publication supabase_realtime add table public.care_pings;
  end if;
end;
$$;

commit;
