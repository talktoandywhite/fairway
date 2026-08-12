-- 0005_goals_leaks_phases.sql
-- The "Start Here" domain: goals, leaks, phases.
--
-- This is the first of the domain migrations (Session 6). Every table here is
-- athlete-owned and follows the same shape the rest of the backlog assumes:
--   * id / created_at / updated_at per the CLAUDE.md conventions
--   * a set_updated_at BEFORE UPDATE trigger
--   * RLS ENABLED, with policies that are one-liners delegating to the helpers
--     from 0003/0004: can_read_athlete(athlete_id) for SELECT, and
--     can_write_athlete(athlete_id) for INSERT/UPDATE/DELETE
--   * explicit grants to `authenticated` — Supabase local does NOT auto-grant
--     (config.toml, auto_expose_new_tables), so a missing grant surfaces as a
--     permission error, not a silent RLS denial.
--
-- The child-table decision (leaks -> goal_id): a leak belongs to a goal, but RLS
-- must resolve to the OWNING ATHLETE. Rather than make every leak policy a
-- subquery join through goals, we DENORMALIZE athlete_id onto leaks and keep the
-- policy a one-liner identical to every other table. To stop the denormalized
-- value ever drifting from its parent, the FK is COMPOSITE — (goal_id,
-- athlete_id) references goals (id, athlete_id) — so the database itself
-- guarantees a leak's athlete_id equals its goal's athlete_id. This is the
-- pattern reused for workout_exercises, workout_logs, and week_templates in 0009.

-- ==========================================================================
-- goals
-- ==========================================================================

-- The athlete's headline objective for a season (e.g. cut the scoring average
-- from 115 to 100 by roster tryouts). `why` is the paragraph that gets read on a
-- bad day — the workbook's version was about making the team; give it room.
create table public.goals (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes (id) on delete cascade,
  season        text not null,
  metric        text not null,
  target_value  numeric(6, 2) not null,
  -- Calendar day, not an instant (CLAUDE.md): a deadline is a date.
  deadline      date,
  baseline_value numeric(6, 2),
  why           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  -- The unique key a child's composite FK targets. `id` is already unique on its
  -- own; this pair exists solely so leaks can reference (id, athlete_id) and thus
  -- inherit the athlete_id integrity guarantee described in the header.
  unique (id, athlete_id)
);

comment on table public.goals is
  'A season objective for an athlete: a metric, a target, a deadline, a baseline, and the reason. Athlete-owned; RLS delegates to can_read_athlete / can_write_athlete.';

create trigger set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create index goals_athlete_idx on public.goals (athlete_id);

alter table public.goals enable row level security;

grant select, insert, update, delete on public.goals to authenticated;

create policy goals_select on public.goals
  for select using (public.can_read_athlete(athlete_id));
create policy goals_insert on public.goals
  for insert with check (public.can_write_athlete(athlete_id));
create policy goals_update on public.goals
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy goals_delete on public.goals
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- leaks
-- ==========================================================================

-- A named source of lost strokes, tracked against a target — the core of the
-- workbook's insight (penalties, three-putts, chunked chips, hero shots). Each
-- leak belongs to a goal. athlete_id is denormalized and pinned to the goal's
-- athlete_id by the composite FK, so the RLS policy is the same one-liner as
-- every other athlete-owned table (see header).
create table public.leaks (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null,
  athlete_id    uuid not null,
  name          text not null,
  -- The current per-round range for this leak (e.g. 6-10 penalty strokes).
  current_low   numeric(5, 1) not null,
  current_high  numeric(5, 1) not null,
  target_value  numeric(5, 1) not null,
  -- Whole strokes this leak, closed to target, is worth. The four reference
  -- leaks sum to the 15-stroke gap.
  strokes_saved smallint not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  -- Composite FK: guarantees athlete_id can never diverge from the parent goal's
  -- athlete_id, which is what lets the RLS policy trust the denormalized column.
  foreign key (goal_id, athlete_id)
    references public.goals (id, athlete_id) on delete cascade,
  constraint leaks_range_ok check (current_high >= current_low)
);

comment on table public.leaks is
  'A tracked source of lost strokes under a goal, with a current per-round range, a target, and its strokes-saved value. athlete_id is denormalized from the parent goal and enforced equal by a composite FK so RLS stays a one-liner.';

create trigger set_updated_at
  before update on public.leaks
  for each row execute function public.set_updated_at();

create index leaks_goal_idx on public.leaks (goal_id, athlete_id);

alter table public.leaks enable row level security;

grant select, insert, update, delete on public.leaks to authenticated;

create policy leaks_select on public.leaks
  for select using (public.can_read_athlete(athlete_id));
create policy leaks_insert on public.leaks
  for insert with check (public.can_write_athlete(athlete_id));
create policy leaks_update on public.leaks
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy leaks_delete on public.leaks
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- phases
-- ==========================================================================

-- A block of the training year with its own focus and score target. The
-- reference plan has five, contiguous and non-overlapping across the season.
-- `seq` orders them; week_templates (0009) hang off a phase via composite FK, so
-- phases carries the same (id, athlete_id) unique key goals does.
create table public.phases (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athletes (id) on delete cascade,
  seq          smallint not null,
  name         text not null,
  starts_on    date not null,
  ends_on      date not null,
  main_job     text,
  score_target numeric(6, 2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  -- One phase per (athlete, seq); the ordering is meaningful and unique.
  unique (athlete_id, seq),
  -- Composite-FK target for week_templates (see 0009).
  unique (id, athlete_id),
  constraint phases_dates_ok check (ends_on >= starts_on)
);

comment on table public.phases is
  'A training-year block with a focus (main_job) and a score target. Non-overlap across an athlete is validated in the app (Session 14); the DB enforces per-phase date order and unique seq.';

create trigger set_updated_at
  before update on public.phases
  for each row execute function public.set_updated_at();

create index phases_athlete_idx on public.phases (athlete_id, seq);

alter table public.phases enable row level security;

grant select, insert, update, delete on public.phases to authenticated;

create policy phases_select on public.phases
  for select using (public.can_read_athlete(athlete_id));
create policy phases_insert on public.phases
  for insert with check (public.can_write_athlete(athlete_id));
create policy phases_update on public.phases
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy phases_delete on public.phases
  for delete using (public.can_write_athlete(athlete_id));
