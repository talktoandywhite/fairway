-- 0001_enums.sql
-- The enum foundation and the updated_at trigger function.
--
-- These types are referenced by nearly every later table, and getting their
-- values wrong is expensive to fix (Postgres enum values cannot be removed or
-- reordered without a type rewrite). The values below are taken verbatim from
-- the workbook's data-validation lists as recorded in README.md, plus three
-- app-level enums not present in the single-athlete workbook:
--   * athlete_level  — from AI_COACH.md (`level: junior | high_school | college`)
--   * workout_part   — the session segment an exercise belongs to
--   * link_status    — the athlete_links lifecycle that drives every RLS policy
--
-- Migrations are checked in and never edited after merge (see CLAUDE.md). If an
-- enum needs a new value later, add it in a new migration with `alter type`.

-- --------------------------------------------------------------------------
-- Rounds
-- --------------------------------------------------------------------------

-- One recorded playing session. Only 18-hole `tournament` rounds feed the
-- headline scoring average.
create type public.round_type as enum (
  'tournament',
  'practice_round',
  'simulated_tournament',
  'nine_hole'
);

-- --------------------------------------------------------------------------
-- Events (the schedule)
-- --------------------------------------------------------------------------

-- Registration lifecycle of a planned tournament. `skipped` is excluded from
-- the season fee total.
create type public.event_status as enum (
  'not_registered',
  'registered',
  'played',
  'skipped'
);

-- How much a given event matters in the season plan.
create type public.event_priority as enum (
  'priority',
  'optional',
  'stretch',
  'backup',
  'low'
);

-- --------------------------------------------------------------------------
-- Practice & lessons
-- --------------------------------------------------------------------------

-- The kind of training block a practice session records. `gym` sessions are
-- also written by strength logging so the minutes-by-type rollup stays honest.
create type public.session_type as enum (
  'range_full_swing',
  'range_wedges',
  'short_game',
  'putting',
  'on_course',
  'gym',
  'lesson'
);

-- Whether the homework a coach assigned actually got done.
create type public.homework_status as enum (
  'yes',
  'partly',
  'no'
);

-- --------------------------------------------------------------------------
-- Links (parents & coaches)
-- --------------------------------------------------------------------------

-- Who a linked user is to the athlete.
create type public.link_relationship as enum (
  'parent',
  'coach'
);

-- What a linked user is allowed to do. RLS delegates write access to this.
create type public.link_permission as enum (
  'read',
  'write'
);

-- The lifecycle of an athlete_links row. A link only grants access while
-- `accepted`; every RLS policy checks for this state. `declined` is
-- recipient-initiated, `revoked` is athlete-initiated, `expired` is when an
-- invitation token lapses before acceptance.
create type public.link_status as enum (
  'pending',
  'accepted',
  'declined',
  'revoked',
  'expired'
);

-- --------------------------------------------------------------------------
-- Athlete profile & strength program
-- --------------------------------------------------------------------------

-- Competitive framing for the athlete. Drives eligibility, tee selection, and
-- programming norms — never tone (see AI_COACH.md).
create type public.athlete_level as enum (
  'junior',
  'high_school',
  'college'
);

-- The segment of a strength session an exercise belongs to, in the order a
-- block's exercise list reads top-to-bottom.
create type public.workout_part as enum (
  'warmup',
  'power',
  'strength',
  'core',
  'mobility',
  'cooldown'
);

-- --------------------------------------------------------------------------
-- updated_at trigger function
-- --------------------------------------------------------------------------

-- Every table carries `updated_at timestamptz` maintained by trigger (see
-- CLAUDE.md conventions). Later table migrations attach a `before update`
-- trigger calling this function; it lives here so it exists before any table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at with now(). Attached per-table in later migrations.';
