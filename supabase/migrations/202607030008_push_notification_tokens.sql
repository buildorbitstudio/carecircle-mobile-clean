-- Expo push token registration for future server-side notifications.

begin;

create table if not exists public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  expo_push_token text not null
    check (char_length(trim(expo_push_token)) between 10 and 512),
  platform text not null check (platform in ('ios', 'android')),
  device_name text,
  app_version text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index if not exists device_push_tokens_user_active_idx
  on public.device_push_tokens(user_id, active)
  where active;

drop trigger if exists device_push_tokens_set_updated_at
on public.device_push_tokens;
create trigger device_push_tokens_set_updated_at
before update on public.device_push_tokens
for each row execute function public.set_updated_at();

alter table public.device_push_tokens enable row level security;
grant select, insert, update, delete on public.device_push_tokens to authenticated;

drop policy if exists "push_tokens_select_own" on public.device_push_tokens;
create policy "push_tokens_select_own"
on public.device_push_tokens for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "push_tokens_insert_own" on public.device_push_tokens;
create policy "push_tokens_insert_own"
on public.device_push_tokens for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "push_tokens_update_own" on public.device_push_tokens;
create policy "push_tokens_update_own"
on public.device_push_tokens for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "push_tokens_delete_own" on public.device_push_tokens;
create policy "push_tokens_delete_own"
on public.device_push_tokens for delete to authenticated
using (user_id = (select auth.uid()));

commit;
