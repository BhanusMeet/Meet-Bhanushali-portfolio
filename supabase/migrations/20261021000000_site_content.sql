-- ════════════════════════════════════════════════════════════════════════════
-- Editable site content (managed from /admin/content)
--
-- One table holds every editable item (work experience, projects, skills, hobbies, certificates and
-- the contact settings). Each row is a `kind` plus a JSON `data` object whose fields are defined and
-- validated by the admin editor; the database enforces the kind whitelist, object shape and size.
--
--   * Public visitors NEVER touch the table. They call get_site_content(), which returns published
--     rows only (this is public portfolio content by definition).
--   * Only administrators (public.is_admin()) can read all rows or insert / update / delete.
--   * Links and image URLs coming from this table are re-validated (https only) when rendered.
-- ════════════════════════════════════════════════════════════════════════════

create table public.site_content (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('experience', 'project', 'skill_group', 'hobby', 'certificate', 'settings')),
  data       jsonb not null,
  position   integer not null default 0,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint site_content_data_shape check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 20000)
);
alter table public.site_content enable row level security;

create index site_content_kind_position_idx on public.site_content (kind, position);
-- Exactly one settings row (contact links).
create unique index site_content_single_settings_idx on public.site_content (kind) where kind = 'settings';

-- Stamp who changed a row and when (never trusted from the client).
create function public.site_content_stamp()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;
create trigger site_content_stamp before insert or update on public.site_content
  for each row execute function public.site_content_stamp();

revoke all on public.site_content from public, anon, authenticated;
grant select, insert, update, delete on public.site_content to authenticated;  -- narrowed to admins by the policies below
grant all on public.site_content to service_role;

create policy "admins read content"   on public.site_content for select to authenticated using ((select public.is_admin()));
create policy "admins insert content" on public.site_content for insert to authenticated with check ((select public.is_admin()));
create policy "admins update content" on public.site_content for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete content" on public.site_content for delete to authenticated using ((select public.is_admin()));

-- Public read: published rows only.
create function public.get_site_content()
returns table (id uuid, kind text, data jsonb, "position" integer)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.kind, c.data, c."position"
  from public.site_content c
  where c.published
  order by c.kind, c."position", c.created_at;
$$;

revoke all on function public.get_site_content()      from public, anon, authenticated;
revoke all on function public.site_content_stamp()    from public, anon, authenticated;
grant execute on function public.get_site_content()   to anon, authenticated, service_role;
