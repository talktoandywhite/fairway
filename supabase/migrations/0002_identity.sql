-- 0002_identity.sql
-- The identity triangle: profiles, athletes, athlete_links.
--
-- This is the load-bearing foundation of the whole authorization model (see
-- CLAUDE.md, "The non-negotiable architectural rule"). `athlete_links` is the
-- join that every later RLS policy consults; `athletes` is the thing every
-- athlete-owned row points at via `athlete_id`; `profiles` is the 1:1 shadow of
-- `auth.users` that carries the display name and role.
--
-- RLS is ENABLED on all three tables in this migration, so none of them is ever
-- exposed without a policy — a table with RLS on and no permissive policy denies
-- everyone, which is the safe default. The self-contained `profiles` policies
-- ship here. The `athletes` and `athlete_links` policies delegate to the
-- security-definer helper functions and therefore ship alongside those helpers
-- in 0003_rls_helpers.sql, which runs immediately after this migration.

-- --------------------------------------------------------------------------
-- profile_role enum
-- --------------------------------------------------------------------------

-- The primary account type of a user. This is coarse identity, not per-athlete
-- relationship — a parent's or coach's link to a specific athlete is captured
-- by athlete_links.relationship. RLS never keys off this value; it exists so the
-- UI can tailor itself and so signup can record what kind of account was made.
create type public.profile_role as enum (
  'athlete',
  'parent',
  'coach'
);

-- --------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, populated by trigger on signup
-- --------------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null,
  role          public.profile_role not null default 'athlete',
  -- Nullable by deliberate exception to the not-null default (CLAUDE.md): the
  -- profile row is created by an AFTER INSERT trigger on auth.users, which may
  -- fire before the signup form has collected a birth date. The Session 5 auth
  -- flow collects it and the COPPA consent gate reads it. Stored as a calendar
  -- `date`, never a timestamp — a birth date is a day, not an instant.
  date_of_birth date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

comment on table public.profiles is
  'One row per auth.users, created by the on_auth_user_created trigger. Carries display name, coarse account role, and (once collected) date of birth.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- athletes — the owner of all athlete data
-- --------------------------------------------------------------------------

-- Every athlete-owned table in later migrations carries `athlete_id` referencing
-- this table. `user_id` is the auth user who *is* this athlete and owns the row;
-- parents and coaches never own an athletes row, they reach it through
-- athlete_links. One auth user is at most one athlete (unique user_id) in the
-- MVP single-athlete model.
create table public.athletes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users (id) on delete cascade,
  level           public.athlete_level not null default 'junior',
  grad_year       smallint,
  school          text,
  home_course     text,
  handicap_index  numeric(4, 1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.athletes is
  'The owner of all athlete data. user_id is the auth user who is this athlete; parents/coaches reach it via athlete_links, never by owning a row here.';

create trigger set_updated_at
  before update on public.athletes
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------------------
-- athlete_links — the join that drives every RLS policy
-- --------------------------------------------------------------------------

-- A grant of access from an athlete to another user (a parent or coach). Access
-- is live only while status = 'accepted'; the helper functions in 0003 check
-- exactly that. `team_id` is added now, unused until V2 teams exist — adding it
-- later would mean migrating live permission data. It is a bare uuid with no FK
-- because the teams table does not exist yet; the FK arrives with that table.
create table public.athlete_links (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athletes (id) on delete cascade,
  linked_user_id uuid not null references auth.users (id) on delete cascade,
  relationship   public.link_relationship not null,
  permission     public.link_permission not null default 'read',
  status         public.link_status not null default 'pending',
  team_id        uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  -- One link per (athlete, user) pair. Re-inviting an existing link updates the
  -- row rather than creating a duplicate.
  unique (athlete_id, linked_user_id)
);

comment on table public.athlete_links is
  'Access grants from an athlete to a parent/coach user. A link grants access only while status = accepted. team_id is reserved for V2 teams (no FK yet).';

comment on column public.athlete_links.team_id is
  'Reserved for the V2 team layer. Nullable, no FK until the teams table exists. Present now so live permission data never has to be migrated to add it.';

create trigger set_updated_at
  before update on public.athlete_links
  for each row execute function public.set_updated_at();

-- Lookups by the linked user: "which athletes can I access?" (Session 17) and
-- the linked-user side of the RLS helpers. The (athlete_id, linked_user_id)
-- unique index already covers the athlete-side helper lookup.
create index athlete_links_linked_user_idx
  on public.athlete_links (linked_user_id, status);

-- --------------------------------------------------------------------------
-- Signup trigger: create a profile for every new auth user
-- --------------------------------------------------------------------------

-- Runs as SECURITY DEFINER so it can insert into public.profiles regardless of
-- the RLS on that table. search_path is pinned to empty and every identifier is
-- schema-qualified, so the function cannot be hijacked by a caller's search_path
-- (the standard hardening for security-definer functions).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, date_of_birth)
  values (
    new.id,
    -- Prefer an explicit display name from signup metadata; fall back to the
    -- local-part of the email so the column is never empty.
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      (new.raw_user_meta_data ->> 'role')::public.profile_role,
      'athlete'
    ),
    -- Null when signup did not supply it; the Session 5 flow fills it in.
    (new.raw_user_meta_data ->> 'date_of_birth')::date
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'AFTER INSERT trigger on auth.users: creates the 1:1 public.profiles row from signup metadata.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- Enable RLS — no identity table is ever exposed without a policy
-- --------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.athletes       enable row level security;
alter table public.athlete_links  enable row level security;

-- --------------------------------------------------------------------------
-- Base table privileges
-- --------------------------------------------------------------------------

-- RLS narrows access row-by-row, but a role still needs a base table grant to
-- touch a table at all. Grant DML to `authenticated` only; `anon` is never
-- granted, and even if it were, every policy keys off auth.uid() and so denies a
-- session with no user. profiles has no DELETE grant — profile rows are removed
-- solely by the auth.users cascade, never through the data API.
grant select, insert, update          on public.profiles      to authenticated;
grant select, insert, update, delete  on public.athletes      to authenticated;
grant select, insert, update, delete  on public.athlete_links to authenticated;

-- --------------------------------------------------------------------------
-- profiles policies (self-contained; no athlete helper needed)
-- --------------------------------------------------------------------------

-- A user sees and edits only their own profile. Cross-user name visibility for
-- linked coaches/parents is a V1 concern (Sessions 17–18); the minimal, safe
-- default is own-row-only. There is deliberately no DELETE policy: profiles are
-- removed only by the auth.users cascade, never through the data API.

create policy profiles_select_own
  on public.profiles
  for select
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
