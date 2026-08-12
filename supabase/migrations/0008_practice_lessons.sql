-- 0008_practice_lessons.sql
-- The Practice Log and the Lesson Log.
--
-- practice_sessions feeds the minutes-by-type rollup and the practice-ratio
-- check (Session 11): the workbook's insight that a 115 shooter practicing
-- mostly full swing has their ratio backwards. `gym` sessions are also written
-- by strength logging (Session 13) so that rollup stays honest.
--
-- lessons is athlete-authored in the MVP; coach_user_id is reserved for the
-- coach-authored path in Session 18. Both tables are athlete-owned and follow
-- the standard RLS pattern.

-- ==========================================================================
-- practice_sessions
-- ==========================================================================

create table public.practice_sessions (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athletes (id) on delete cascade,
  occurred_on  date not null,
  session_type public.session_type not null,
  minutes      smallint not null,
  focus        text,
  drill        text,
  result       text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  constraint practice_minutes_ok check (minutes > 0)
);

comment on table public.practice_sessions is
  'A logged training block: type, minutes, focus, drill, result. Feeds minutes-by-type and the practice-ratio check. gym sessions are also written by strength logging so the rollup stays honest. Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.practice_sessions
  for each row execute function public.set_updated_at();

-- The minutes-by-type rollup walks an athlete's sessions over a window,
-- newest-first — the hot index called out in the backlog.
create index practice_sessions_athlete_occurred_on_idx
  on public.practice_sessions (athlete_id, occurred_on desc);

alter table public.practice_sessions enable row level security;

grant select, insert, update, delete on public.practice_sessions to authenticated;

create policy practice_sessions_select on public.practice_sessions
  for select using (public.can_read_athlete(athlete_id));
create policy practice_sessions_insert on public.practice_sessions
  for insert with check (public.can_write_athlete(athlete_id));
create policy practice_sessions_update on public.practice_sessions
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy practice_sessions_delete on public.practice_sessions
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- lessons
-- ==========================================================================

-- A lesson with a coach: swing key, drill assigned, homework and whether it got
-- done, cost, and what changed. Outstanding homework surfaces on the dashboard
-- (Session 12). coach_user_id is nullable and reserved for Session 18, when a
-- linked coach authors the entry directly; in the MVP the athlete records it and
-- coach_name is free text. The FK is `on delete set null` so removing a coach's
-- auth account never deletes the athlete's lesson history.
create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  athlete_id      uuid not null references public.athletes (id) on delete cascade,
  coach_user_id   uuid references auth.users (id) on delete set null,
  coach_name      text,
  occurred_on     date not null,
  swing_key       text,
  drill_assigned  text,
  homework_target text,
  homework_done   public.homework_status,
  -- Money in integer cents (CLAUDE.md).
  cost_cents      integer,
  what_changed    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.lessons is
  'A lesson entry: coach, swing key, drill, homework status, cost, what changed. Athlete-authored in the MVP (coach_user_id reserved for Session 18). Athlete-owned; RLS delegates to the helpers.';

create trigger set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create index lessons_athlete_occurred_on_idx
  on public.lessons (athlete_id, occurred_on desc);

alter table public.lessons enable row level security;

grant select, insert, update, delete on public.lessons to authenticated;

create policy lessons_select on public.lessons
  for select using (public.can_read_athlete(athlete_id));
create policy lessons_insert on public.lessons
  for insert with check (public.can_write_athlete(athlete_id));
create policy lessons_update on public.lessons
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy lessons_delete on public.lessons
  for delete using (public.can_write_athlete(athlete_id));
