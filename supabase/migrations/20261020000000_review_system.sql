-- ════════════════════════════════════════════════════════════════════════════
-- Private client review system
--
-- Security model (summary):
--   * RLS is enabled on every table. Anonymous users have NO table privileges at all.
--   * Invitation tokens are never stored — only their SHA-256 hash (hex).
--   * Public visitors reach data ONLY through narrowly-scoped functions:
--       - get_public_testimonials()  (anon + authenticated; approved + consented only)
--     Everything that touches invitations is callable by service_role only, i.e. from
--     trusted Edge Functions: get_invitation_status, submit_review, check_rate_limit.
--   * Administrators are an explicit allow-list (admin_users). There is no sign-up path.
--   * Review submission consumes the invitation and inserts the testimonial in ONE
--     transaction, guarded by a row lock and a UNIQUE(invitation_id) constraint.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Admin allow-list ────────────────────────────────────────────────────────
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
-- Intentionally NO policies: the table cannot be read or written through the API.

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

-- ── Invitations ─────────────────────────────────────────────────────────────
create table public.review_invitations (
  id           uuid primary key default gen_random_uuid(),
  -- SHA-256 hex of the raw token. The raw token is shown once at creation and never stored.
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  client_name  text not null check (char_length(client_name) between 1 and 80),
  client_email text check (client_email is null or (char_length(client_email) <= 254 and client_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  project_name text check (project_name is null or char_length(project_name) between 1 and 100),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  constraint invitation_expiry_window check (expires_at > created_at and expires_at <= created_at + interval '90 days')
);
alter table public.review_invitations enable row level security;
create index review_invitations_created_idx on public.review_invitations (created_at desc);
create index review_invitations_open_idx    on public.review_invitations (expires_at) where used_at is null and revoked_at is null;

-- ── Testimonials ────────────────────────────────────────────────────────────
create table public.testimonials (
  id                     uuid primary key default gen_random_uuid(),
  -- UNIQUE: at most one testimonial per invitation, enforced by the database itself.
  invitation_id          uuid not null unique references public.review_invitations (id) on delete restrict,
  client_name            text not null check (char_length(client_name) between 1 and 80),
  company_name           text check (company_name is null or char_length(company_name) between 1 and 100),
  project_name           text check (project_name is null or char_length(project_name) between 1 and 100),
  role                   text check (role is null or char_length(role) between 1 and 100),
  rating                 integer not null check (rating between 1 and 5),
  review_text            text not null check (char_length(review_text) between 20 and 2000),
  public_display_consent boolean not null default false,
  status                 text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at           timestamptz not null default now(),
  reviewed_at            timestamptz,
  reviewed_by            uuid references auth.users (id) on delete set null,
  constraint moderation_consistency check ((status = 'pending') = (reviewed_at is null))
);
alter table public.testimonials enable row level security;
create index testimonials_status_idx on public.testimonials (status, submitted_at desc);
create index testimonials_public_idx on public.testimonials (submitted_at desc) where status = 'approved' and public_display_consent;

-- ── Rate limiting (fixed window, keyed by hashed client identifier) ─────────
create table public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- Table privileges: deny by default, then grant the minimum.
-- ════════════════════════════════════════════════════════════════════════════
revoke all on public.admin_users, public.review_invitations, public.testimonials, public.rate_limits from public, anon, authenticated;

-- Admin dashboard reads (still gated by the RLS policies below). token_hash is NOT granted.
grant select (id, client_name, client_email, project_name, created_by, created_at, expires_at, used_at, revoked_at)
  on public.review_invitations to authenticated;
grant select, delete on public.testimonials to authenticated;

-- Trusted server-side role (Edge Functions).
grant all on public.admin_users, public.review_invitations, public.testimonials, public.rate_limits to service_role;

-- ── RLS policies (authenticated role only, and only for admins) ─────────────
create policy "admins read invitations" on public.review_invitations
  for select to authenticated using ((select public.is_admin()));

create policy "admins read testimonials" on public.testimonials
  for select to authenticated using ((select public.is_admin()));

create policy "admins delete testimonials" on public.testimonials
  for delete to authenticated using ((select public.is_admin()));
-- No INSERT/UPDATE policies or grants exist for anon/authenticated: testimonials can only be
-- created by submit_review() and moderated by moderate_review().

-- ════════════════════════════════════════════════════════════════════════════
-- Functions
-- ════════════════════════════════════════════════════════════════════════════

-- Strip control characters (keeps \n and \t), normalise line endings, trim; empty -> NULL.
create function public.clean_text(p text)
returns text
language sql immutable set search_path = ''
as $$
  select nullif(btrim(regexp_replace(replace(replace(coalesce(p, ''), E'\r\n', E'\n'), E'\r', E'\n'), '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), '');
$$;

-- Public, read-only: approved AND consented testimonials, safe columns only.
-- Both conditions are re-checked here in the database, regardless of what the UI does.
create function public.get_public_testimonials()
returns table (id uuid, client_name text, company_name text, project_name text, role text, rating integer, review_text text, submitted_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.client_name, t.company_name, t.project_name, t.role, t.rating, t.review_text, t.submitted_at
  from public.testimonials t
  where t.status = 'approved' and t.public_display_consent = true
  order by t.submitted_at desc
  limit 60;
$$;

-- Read-only invitation check for the review page. Edge Function (service_role) only.
create function public.get_invitation_status(p_token_hash text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare inv public.review_invitations;
begin
  select * into inv from public.review_invitations where token_hash = p_token_hash;
  if not found then return jsonb_build_object('valid', false, 'reason', 'invalid'); end if;
  if inv.revoked_at is not null then return jsonb_build_object('valid', false, 'reason', 'revoked'); end if;
  if inv.used_at is not null then return jsonb_build_object('valid', false, 'reason', 'used'); end if;
  if inv.expires_at <= now() then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  return jsonb_build_object('valid', true, 'clientName', inv.client_name, 'projectName', inv.project_name);
end;
$$;

-- ATOMIC: validate the invitation, insert the pending testimonial, consume the invitation.
-- The row lock (FOR UPDATE) serialises concurrent submissions of the same token; the loser
-- sees used_at already set. UNIQUE(invitation_id) is a second, independent backstop.
-- Status, timestamps, reviewer and invitation id are never taken from the caller.
create function public.submit_review(
  p_token_hash   text,
  p_client_name  text,
  p_company_name text,
  p_project_name text,
  p_role         text,
  p_rating       integer,
  p_review_text  text,
  p_consent      boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  inv     public.review_invitations;
  v_name  text := public.clean_text(p_client_name);
  v_co    text := public.clean_text(p_company_name);
  v_proj  text := public.clean_text(p_project_name);
  v_role  text := public.clean_text(p_role);
  v_text  text := public.clean_text(p_review_text);
begin
  select * into inv from public.review_invitations where token_hash = p_token_hash for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if inv.revoked_at is not null then return jsonb_build_object('ok', false, 'reason', 'revoked'); end if;
  if inv.used_at is not null then return jsonb_build_object('ok', false, 'reason', 'used'); end if;
  if inv.expires_at <= now() then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;

  if v_name is null or char_length(v_name) > 80
     or (v_co is not null and char_length(v_co) > 100)
     or (v_proj is not null and char_length(v_proj) > 100)
     or (v_role is not null and char_length(v_role) > 100)
     or p_rating is null or p_rating not between 1 and 5
     or v_text is null or char_length(v_text) not between 20 and 2000
     or p_consent is null
  then
    return jsonb_build_object('ok', false, 'reason', 'validation');
  end if;

  insert into public.testimonials (invitation_id, client_name, company_name, project_name, role, rating, review_text, public_display_consent)
  values (inv.id, v_name, v_co, coalesce(v_proj, inv.project_name), v_role, p_rating, v_text, p_consent);

  update public.review_invitations set used_at = now() where id = inv.id;

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'used');
end;
$$;

-- Admin moderation. Runs as definer but checks is_admin() itself and stamps the reviewer.
create function public.moderate_review(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.testimonials
     set status      = p_status,
         reviewed_at = case when p_status = 'pending' then null else now() end,
         reviewed_by = case when p_status = 'pending' then null else (select auth.uid()) end
   where id = p_id;
  if not found then
    raise exception 'not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Fixed-window rate limiter. Returns true while the caller is within the limit. service_role only.
create function public.check_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rl.hits + 1
  returning rl.hits into v_hits;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_limit;
end;
$$;

-- ── Function privileges: revoke the default PUBLIC execute, then grant explicitly ──
revoke all on function public.is_admin()                                   from public, anon, authenticated;
revoke all on function public.clean_text(text)                             from public, anon, authenticated;
revoke all on function public.get_public_testimonials()                    from public, anon, authenticated;
revoke all on function public.get_invitation_status(text)                  from public, anon, authenticated;
revoke all on function public.submit_review(text, text, text, text, text, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.moderate_review(uuid, text)                  from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, integer)     from public, anon, authenticated;

grant execute on function public.is_admin()                  to authenticated;   -- used by RLS policies + admin UI
grant execute on function public.moderate_review(uuid, text) to authenticated;   -- self-checks is_admin()
grant execute on function public.get_public_testimonials()   to anon, authenticated;

grant execute on function public.is_admin(), public.clean_text(text), public.get_public_testimonials(),
  public.get_invitation_status(text),
  public.submit_review(text, text, text, text, text, integer, text, boolean),
  public.moderate_review(uuid, text),
  public.check_rate_limit(text, integer, integer)
  to service_role;
