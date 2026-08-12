-- 0009_workouts_week_templates.sql
-- The Strength Program and the Weekly Schedule.
--
-- Four tables, three of them children that key off a parent. They reuse the
-- denormalize-athlete_id + composite-FK pattern established in 0005 (leaks):
--   * workout_exercises -> workout_blocks  (block_id, athlete_id)
--   * workout_logs      -> workout_exercises (exercise_id, athlete_id)
--   * week_templates    -> phases          (phase_id, athlete_id)  [phases from 0005]
-- In each, athlete_id is denormalized so the RLS policy is the same one-liner as
-- every other table, and a COMPOSITE FK pins it to the parent's athlete_id so the
-- two can never diverge. Each parent therefore carries a unique (id, athlete_id)
-- key for its child's FK to target (phases already has one from 0005).
--
-- Every table is athlete-owned and RLS delegates to can_read_athlete /
-- can_write_athlete, with explicit grants to `authenticated`.

-- ==========================================================================
-- workout_blocks — a strength mesocycle (A, B, C in the reference plan)
-- ==========================================================================

create table public.workout_blocks (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references public.athletes (id) on delete cascade,
  name                text not null,
  starts_on           date not null,
  ends_on             date not null,
  sessions_per_week   smallint,
  minutes_per_session smallint,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  -- Composite-FK target for workout_exercises.
  unique (id, athlete_id),
  constraint workout_blocks_dates_ok check (ends_on >= starts_on)
);

comment on table public.workout_blocks is
  'A strength-training mesocycle with a date range and a weekly cadence. The current block is surfaced by date (Session 13). Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.workout_blocks
  for each row execute function public.set_updated_at();

create index workout_blocks_athlete_idx on public.workout_blocks (athlete_id, starts_on);

alter table public.workout_blocks enable row level security;

grant select, insert, update, delete on public.workout_blocks to authenticated;

create policy workout_blocks_select on public.workout_blocks
  for select using (public.can_read_athlete(athlete_id));
create policy workout_blocks_insert on public.workout_blocks
  for insert with check (public.can_write_athlete(athlete_id));
create policy workout_blocks_update on public.workout_blocks
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy workout_blocks_delete on public.workout_blocks
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- workout_exercises — the exercise list within a block
-- ==========================================================================

-- reps is TEXT, not an integer: strength prescriptions are ranges and schemes
-- ("8-10", "3x5", "30s hold", "AMRAP"), not a single number. sets is a plain
-- count. `part` orders the list top-to-bottom the way the block reads.
create table public.workout_exercises (
  id            uuid primary key default gen_random_uuid(),
  block_id      uuid not null,
  athlete_id    uuid not null,
  part          public.workout_part not null,
  name          text not null,
  sets          smallint,
  reps          text,
  coaching_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  foreign key (block_id, athlete_id)
    references public.workout_blocks (id, athlete_id) on delete cascade,
  -- Composite-FK target for workout_logs.
  unique (id, athlete_id)
);

comment on table public.workout_exercises is
  'An exercise within a workout block: part, name, sets, reps (text — ranges/schemes, not one number), coaching note. athlete_id is denormalized from the block and pinned equal by a composite FK. Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.workout_exercises
  for each row execute function public.set_updated_at();

create index workout_exercises_block_idx on public.workout_exercises (block_id, athlete_id);

alter table public.workout_exercises enable row level security;

grant select, insert, update, delete on public.workout_exercises to authenticated;

create policy workout_exercises_select on public.workout_exercises
  for select using (public.can_read_athlete(athlete_id));
create policy workout_exercises_insert on public.workout_exercises
  for insert with check (public.can_write_athlete(athlete_id));
create policy workout_exercises_update on public.workout_exercises
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy workout_exercises_delete on public.workout_exercises
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- workout_logs — a performed set of an exercise
-- ==========================================================================

-- What actually got done on a day. load is TEXT for the same reason reps is:
-- "bodyweight", "band", "20 lb DB" are all valid and none is a number — and it
-- is deliberately NOT money, so the integer-cents rule does not apply.
create table public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null,
  exercise_id  uuid not null,
  performed_on date not null,
  sets_done    smallint,
  reps_done    smallint,
  load         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  foreign key (exercise_id, athlete_id)
    references public.workout_exercises (id, athlete_id) on delete cascade
);

comment on table public.workout_logs is
  'A performed set/rep record against an exercise. load is free text (bodyweight/band/weight), not money. athlete_id is denormalized from the exercise and pinned equal by a composite FK. Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.workout_logs
  for each row execute function public.set_updated_at();

create index workout_logs_athlete_performed_on_idx
  on public.workout_logs (athlete_id, performed_on desc);
create index workout_logs_exercise_idx on public.workout_logs (exercise_id, athlete_id);

alter table public.workout_logs enable row level security;

grant select, insert, update, delete on public.workout_logs to authenticated;

create policy workout_logs_select on public.workout_logs
  for select using (public.can_read_athlete(athlete_id));
create policy workout_logs_insert on public.workout_logs
  for insert with check (public.can_write_athlete(athlete_id));
create policy workout_logs_update on public.workout_logs
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy workout_logs_delete on public.workout_logs
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- week_templates — the weekly plan for a phase
-- ==========================================================================

-- The per-phase weekly template that generates the athlete's actual week
-- (Session 13). Keyed off a phase; athlete_id denormalized and pinned by a
-- composite FK to phases (id, athlete_id) from 0005. day_of_week is ISO: 1 =
-- Monday .. 7 = Sunday.
create table public.week_templates (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null,
  athlete_id  uuid not null,
  day_of_week smallint not null,
  activity    text not null,
  minutes     smallint,
  detail      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  foreign key (phase_id, athlete_id)
    references public.phases (id, athlete_id) on delete cascade,
  constraint week_templates_dow_ok check (day_of_week between 1 and 7)
);

comment on table public.week_templates is
  'A row of a phase''s weekly template: day (ISO 1=Mon..7=Sun), activity, minutes, detail. athlete_id is denormalized from the phase and pinned equal by a composite FK. Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.week_templates
  for each row execute function public.set_updated_at();

create index week_templates_phase_idx on public.week_templates (phase_id, athlete_id, day_of_week);

alter table public.week_templates enable row level security;

grant select, insert, update, delete on public.week_templates to authenticated;

create policy week_templates_select on public.week_templates
  for select using (public.can_read_athlete(athlete_id));
create policy week_templates_insert on public.week_templates
  for insert with check (public.can_write_athlete(athlete_id));
create policy week_templates_update on public.week_templates
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy week_templates_delete on public.week_templates
  for delete using (public.can_write_athlete(athlete_id));
