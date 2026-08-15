-- 0010_practice_segments.sql
-- One practice session, many segments — and `gym` becomes `exercise`.
--
-- Session 11 shipped a practice session as a single (type, minutes) pair. That
-- is not how an athlete at this level actually trains. A day's work is routinely
-- a 1.5–3 hour block covering exercise, full swing, short game and putting, and
-- forcing that into four separate "sessions" is both tedious to log and wrong
-- about what happened: it was one session with four parts.
--
-- So `practice_sessions` becomes the DAY'S BLOCK — a date and its notes — and
-- each `practice_segments` row carries one discipline, its OWN minutes, and its
-- own focus/drill/result. The detail moves down with the minutes because it
-- belongs there: "made 18 of 20 from 4 ft" describes the putting segment, not
-- the whole afternoon.
--
-- The rule this preserves, and the reason segments carry their own minutes
-- rather than the session carrying a total: every minute stays attributed to a
-- discipline the athlete actually typed it against. Splitting a 150-minute block
-- evenly across four disciplines would put numbers nobody entered into the
-- minutes-by-type rollup and the practice-ratio check, which are the two things
-- on that screen an athlete is meant to act on.

-- ==========================================================================
-- session_type: gym -> exercise
-- ==========================================================================

-- `exercise` is the athlete-facing word for this work and the one the UI uses,
-- so the enum uses it too (CLAUDE.md: the glossary is used in code, in the
-- database, and in the UI). Renaming rather than adding-and-migrating keeps the
-- enum to seven values; `session_type` is referenced by exactly one column, so
-- this is contained. Existing rows carry the new label automatically.
alter type public.session_type rename value 'gym' to 'exercise';

-- ==========================================================================
-- practice_sessions — now the day's block
-- ==========================================================================

-- The unique key the child's composite FK targets. `id` is already unique on its
-- own; this pair exists so practice_segments can reference (id, athlete_id) and
-- inherit the athlete_id integrity guarantee — the same pattern goals/leaks use
-- in 0005, which is what lets every RLS policy stay a one-liner.
alter table public.practice_sessions
  add constraint practice_sessions_id_athlete_key unique (id, athlete_id);

-- ==========================================================================
-- practice_segments
-- ==========================================================================

create table public.practice_segments (
  id                  uuid primary key default gen_random_uuid(),
  practice_session_id uuid not null,
  athlete_id          uuid not null,
  session_type        public.session_type not null,
  minutes             smallint not null,
  focus               text,
  drill               text,
  result              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  -- Composite FK: guarantees athlete_id can never diverge from the parent
  -- session's athlete_id, which is what lets the RLS policy trust the
  -- denormalized column (see 0005's header for the full reasoning).
  foreign key (practice_session_id, athlete_id)
    references public.practice_sessions (id, athlete_id) on delete cascade,
  constraint practice_segment_minutes_ok check (minutes > 0),
  -- One row per discipline per session. This is exactly what the multi-select
  -- form can express, it makes "replace this session's segments" unambiguous,
  -- and it stops a double-submit silently doubling a session's minutes.
  constraint practice_segments_one_row_per_type
    unique (practice_session_id, session_type)
);

comment on table public.practice_segments is
  'One discipline within a practice session, with its own minutes and its own focus/drill/result. Minutes are always attributed per discipline and never split or inferred from a session total — the minutes-by-type rollup and the practice-ratio check are only as honest as this column. athlete_id is denormalized from the parent session and enforced equal by a composite FK so RLS stays a one-liner.';

create trigger set_updated_at
  before update on public.practice_segments
  for each row execute function public.set_updated_at();

-- The parent lookup, for rendering a session with its segments.
create index practice_segments_session_idx
  on public.practice_segments (practice_session_id, athlete_id);

-- The rollup walks an athlete's segments by discipline over a window.
create index practice_segments_athlete_type_idx
  on public.practice_segments (athlete_id, session_type);

alter table public.practice_segments enable row level security;

grant select, insert, update, delete on public.practice_segments to authenticated;

create policy practice_segments_select on public.practice_segments
  for select using (public.can_read_athlete(athlete_id));
create policy practice_segments_insert on public.practice_segments
  for insert with check (public.can_write_athlete(athlete_id));
create policy practice_segments_update on public.practice_segments
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy practice_segments_delete on public.practice_segments
  for delete using (public.can_write_athlete(athlete_id));

-- ==========================================================================
-- Backfill, then drop the moved columns
-- ==========================================================================

-- Every existing session becomes a one-segment session. created_at is carried
-- across so the segment is not born looking newer than the work it records.
insert into public.practice_segments
  (practice_session_id, athlete_id, session_type, minutes, focus, drill, result, created_at)
select id, athlete_id, session_type, minutes, focus, drill, result, created_at
from public.practice_sessions;

-- The per-discipline columns now live on the child. Dropping them takes the
-- practice_minutes_ok check with them; the segment-level check above replaces it.
alter table public.practice_sessions
  drop column session_type,
  drop column minutes,
  drop column focus,
  drop column drill,
  drop column result;

comment on table public.practice_sessions is
  'A day''s training block: when it happened, plus notes. The disciplines worked on, and the minutes spent on each, live in practice_segments. Athlete-owned; RLS delegates to the helpers.';

-- ==========================================================================
-- replace_practice_segments — the atomic edit path
-- ==========================================================================

-- Editing a session means replacing its whole set of segments, which is a delete
-- and an insert. Run as two calls from the app those are two transactions, and a
-- failure between them leaves a session with NO segments — a row that silently
-- contributes zero minutes to the rollup while still looking like a logged
-- session. One function body is one transaction, so it can't half-happen.
--
-- SECURITY INVOKER (the default, stated here because it is load-bearing): every
-- statement below runs as the calling user, so the practice_sessions select
-- policy decides whether the session is even visible, and the practice_segments
-- insert/delete policies gate the writes. This function grants no privilege the
-- caller did not already have — it only makes the pair atomic.
create function public.replace_practice_segments(
  p_session_id uuid,
  p_segments   jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_athlete_id uuid;
begin
  -- RLS-filtered: a session the caller may not read simply isn't here.
  select athlete_id into v_athlete_id
  from public.practice_sessions
  where id = p_session_id;

  if v_athlete_id is null then
    raise exception 'practice session % not found', p_session_id
      using errcode = 'no_data_found';
  end if;

  if p_segments is null or jsonb_array_length(p_segments) = 0 then
    raise exception 'a practice session must keep at least one segment'
      using errcode = 'check_violation';
  end if;

  delete from public.practice_segments
  where practice_session_id = p_session_id;

  insert into public.practice_segments
    (practice_session_id, athlete_id, session_type, minutes, focus, drill, result)
  select
    p_session_id,
    v_athlete_id,
    (segment->>'session_type')::public.session_type,
    (segment->>'minutes')::smallint,
    nullif(btrim(coalesce(segment->>'focus', '')), ''),
    nullif(btrim(coalesce(segment->>'drill', '')), ''),
    nullif(btrim(coalesce(segment->>'result', '')), '')
  from jsonb_array_elements(p_segments) as segment;
end;
$$;

comment on function public.replace_practice_segments(uuid, jsonb) is
  'Atomically replace every segment of a practice session. SECURITY INVOKER, so RLS decides what the caller may touch; the function exists only so the delete and the insert cannot half-happen and strand a session with no minutes.';

grant execute on function public.replace_practice_segments(uuid, jsonb) to authenticated;
