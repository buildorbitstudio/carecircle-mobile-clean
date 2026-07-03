-- Private Document Vault bucket and family-scoped Storage policies.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'carecircle-documents',
  'carecircle-documents',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_document_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.family_id::text = split_part(object_name, '/', 1)
  );
$$;

create or replace function private.can_admin_document_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.user_id = (select auth.uid())
      and fm.status = 'active'
      and fm.role = 'admin'
      and fm.family_id::text = split_part(object_name, '/', 1)
  );
$$;

revoke all on function private.can_access_document_object(text) from public;
revoke all on function private.can_admin_document_object(text) from public;
grant execute on function private.can_access_document_object(text) to authenticated;
grant execute on function private.can_admin_document_object(text) to authenticated;

drop policy if exists "document_vault_select_family" on storage.objects;
create policy "document_vault_select_family"
on storage.objects for select to authenticated
using (
  bucket_id = 'carecircle-documents'
  and private.can_access_document_object(name)
);

drop policy if exists "document_vault_insert_family" on storage.objects;
create policy "document_vault_insert_family"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'carecircle-documents'
  and private.can_access_document_object(name)
);

drop policy if exists "document_vault_delete_admin" on storage.objects;
create policy "document_vault_delete_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'carecircle-documents'
  and (
    private.can_admin_document_object(name)
    or owner_id = (select auth.uid())::text
  )
);

drop policy if exists "documents_delete_uploader_or_admin" on public.documents;
drop policy if exists "documents_delete_admins" on public.documents;
create policy "documents_delete_admins"
on public.documents for delete to authenticated
using (private.is_family_admin(family_id));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'documents'
  ) then
    alter publication supabase_realtime add table public.documents;
  end if;
end;
$$;

commit;
