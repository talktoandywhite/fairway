-- 0006_tours_events.sql
-- The schedule domain: tours (a shared catalog) and events (athlete-owned).
--
-- tours is the one exception to the athlete-owned pattern in this backlog. It is
-- a shared reference catalog of the organizations that run junior events, keyed
-- by nobody — every authenticated user reads the same rows. It carries no
-- athlete_id and its RLS is a blanket read for `authenticated`; there is NO
-- write grant to users in the MVP, so the catalog is curated by the service role
-- only (Session 21 adds an athlete-submission + moderation flow). RLS is still
-- ENABLED so the table is never wide open — a granted SELECT plus a permissive
-- read policy is the whole authorization surface, and with no write grant there
-- is nothing for a write policy to guard.
--
-- events is athlete-owned and follows the standard pattern (0005).

-- ==========================================================================
-- tours — shared catalog
-- ==========================================================================

create table public.tours (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  org                   text,
  format                text,
  age_min               smallint,
  age_max               smallint,
  season                text,
  -- Money in integer cents, never floats (CLAUDE.md).
  membership_cost_cents integer,
  entry_fee_cents       integer,
  region                text,
  website               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  constraint tours_age_ok check (age_max is null or age_min is null or age_max >= age_min)
);

comment on table public.tours is
  'Shared, community-maintained catalog of tour organizations. Readable by every authenticated user; not writable through the data API in the MVP (service-role curation only). Athlete submission + moderation arrive in Session 21.';

create trigger set_updated_at
  before update on public.tours
  for each row execute function public.set_updated_at();

alter table public.tours enable row level security;

-- SELECT only. No insert/update/delete grant: users cannot write the catalog.
grant select on public.tours to authenticated;

-- Every authenticated user reads the whole catalog. `anon` is not granted, so a
-- signed-out session sees nothing regardless of this policy.
create policy tours_select_all on public.tours
  for select
  to authenticated
  using (true);

-- ==========================================================================
-- events — the athlete's schedule
-- ==========================================================================

-- A planned or completed tournament on the athlete's schedule. Optionally
-- sourced from a catalog tour (tour_id), which is nulled if that catalog row is
-- ever removed — the event and its history survive.
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athletes (id) on delete cascade,
  tour_id         uuid references public.tours (id) on delete set null,
  plays_on        date not null,
  name            text not null,
  course          text,
  city            text,
  holes           smallint not null default 18,
  entry_fee_cents integer,
  priority        public.event_priority not null default 'optional',
  status          public.event_status not null default 'not_registered',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  constraint events_holes_ok check (holes in (9, 18))
);

comment on table public.events is
  'A planned/played tournament on an athlete''s schedule. Drives gap-day warnings and the season fee total (which excludes skipped). Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- The gap-analysis and schedule queries walk an athlete's events in date order.
create index events_athlete_plays_on_idx on public.events (athlete_id, plays_on);

alter table public.events enable row level security;

grant select, insert, update, delete on public.events to authenticated;

create policy events_select on public.events
  for select using (public.can_read_athlete(athlete_id));
create policy events_insert on public.events
  for insert with check (public.can_write_athlete(athlete_id));
create policy events_update on public.events
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy events_delete on public.events
  for delete using (public.can_write_athlete(athlete_id));
