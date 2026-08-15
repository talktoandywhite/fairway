-- rls_domain.sql
-- pgTAP proof that every athlete-owned domain table shipped in Session 6
-- (0005-0010) enforces the CLAUDE.md rule: a row is visible only to the athlete
-- and to users with an accepted link, and to nobody else. Here we prove the
-- "nobody else" half against an UNLINKED user, on every one of the twelve
-- athlete-owned tables, and confirm the thirteenth table (tours) is the
-- deliberate shared-catalog exception — readable by any authenticated user.
--
-- practice_segments (0010) is the newest of them and the one most worth reading
-- closely: it holds every minute the Practice Log measures, and it reaches its
-- athlete_id through a composite FK rather than a direct column the caller sets.
--
-- Run with `pnpm test:rls` (supabase test db) against the local stack.
--
-- Method mirrors rls_identity.sql / rls_consent.sql: seed fixtures as the
-- superuser test role (bypasses RLS, but triggers still fire — the athlete lands
-- `active` from an adult DOB so writes are not consent-frozen), then drop to the
-- `authenticated` role and drive auth.uid() via request.jwt.claims to assert what
-- the owner and an unlinked stranger can and cannot see and do.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- 12 owner-can-read + 12 stranger-denied + 1 tours-shared-read
-- + 3 stranger-write-denied = 28.
select plan(28);

-- --------------------------------------------------------------------------
-- Fixtures (seeded as superuser; RLS does not apply, triggers do)
-- --------------------------------------------------------------------------

-- Owner (adult DOB -> athlete stamped active) and an unrelated stranger with no
-- link of any kind to the athlete.
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  ('c0de0001-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
     'owner@test.dev',    '{"date_of_birth":"1999-01-01"}'::jsonb),
  ('c0de0009-0000-4000-a000-000000000009', 'authenticated', 'authenticated',
     'stranger@test.dev', '{}'::jsonb);

-- The athlete, owned by the owner.
insert into public.athletes (id, user_id, level)
values ('a71e7e00-0000-4000-a000-00000000000a',
        'c0de0001-0000-4000-a000-000000000001', 'high_school');

-- One row in each athlete-owned table. Parents get fixed ids so the composite-FK
-- children (leaks, workout_exercises, workout_logs, week_templates) can point at
-- them with a matching athlete_id.
insert into public.goals (id, athlete_id, season, metric, target_value)
values ('90a10000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', '2025-2026', 'scoring_average', 100);

insert into public.leaks (goal_id, athlete_id, name, current_low, current_high, target_value, strokes_saved)
values ('90a10000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 'Penalty strokes', 6, 10, 2, 5);

insert into public.phases (id, athlete_id, seq, name, starts_on, ends_on)
values ('b0a50000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 1, 'Assess', '2025-08-01', '2025-09-15');

insert into public.week_templates (phase_id, athlete_id, day_of_week, activity)
values ('b0a50000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 1, 'Short game');

insert into public.events (id, athlete_id, plays_on, name)
values ('e0e00000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', '2025-09-13', 'NTPGA #1');

insert into public.rounds (athlete_id, event_id, played_on, course, round_type, holes, par, score)
values ('a71e7e00-0000-4000-a000-00000000000a', 'e0e00000-0000-4000-a000-000000000001',
        '2025-09-13', 'Bridlewood', 'tournament', 18, 72, 108);

insert into public.practice_sessions (id, athlete_id, occurred_on)
values ('50e50000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', '2025-09-14');

insert into public.practice_segments (practice_session_id, athlete_id, session_type, minutes)
values ('50e50000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 'putting', 45);

insert into public.lessons (athlete_id, coach_name, occurred_on)
values ('a71e7e00-0000-4000-a000-00000000000a', 'Coach Diaz', '2025-09-15');

insert into public.workout_blocks (id, athlete_id, name, starts_on, ends_on)
values ('b10c0000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 'Block A', '2025-11-16', '2025-12-31');

insert into public.workout_exercises (id, block_id, athlete_id, part, name)
values ('e0e50000-0000-4000-a000-000000000001', 'b10c0000-0000-4000-a000-000000000001',
        'a71e7e00-0000-4000-a000-00000000000a', 'strength', 'Goblet squat');

insert into public.workout_logs (athlete_id, exercise_id, performed_on)
values ('a71e7e00-0000-4000-a000-00000000000a', 'e0e50000-0000-4000-a000-000000000001', '2025-11-20');

-- A tour, to prove the shared catalog is readable by an unlinked authenticated
-- user (the deliberate exception to the athlete-owned rule).
insert into public.tours (name) values ('NTPGA Medalist Series');

-- --------------------------------------------------------------------------
-- Become a normal authenticated user; switch identity via the JWT sub
-- --------------------------------------------------------------------------

set local role authenticated;

create or replace function pg_temp.act_as(user_id uuid)
returns void
language sql
as $$
  select set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text,
    true
  );
$$;

-- --------------------------------------------------------------------------
-- 1-12. The owner can read every athlete-owned table (the gate is a gate)
-- --------------------------------------------------------------------------

select pg_temp.act_as('c0de0001-0000-4000-a000-000000000001');

select is((select count(*) from public.goals)::bigint,             1::bigint, 'owner reads goals');
select is((select count(*) from public.leaks)::bigint,             1::bigint, 'owner reads leaks');
select is((select count(*) from public.phases)::bigint,            1::bigint, 'owner reads phases');
select is((select count(*) from public.events)::bigint,            1::bigint, 'owner reads events');
select is((select count(*) from public.rounds)::bigint,            1::bigint, 'owner reads rounds');
select is((select count(*) from public.practice_sessions)::bigint, 1::bigint, 'owner reads practice_sessions');
select is((select count(*) from public.practice_segments)::bigint, 1::bigint, 'owner reads practice_segments');
select is((select count(*) from public.lessons)::bigint,           1::bigint, 'owner reads lessons');
select is((select count(*) from public.workout_blocks)::bigint,    1::bigint, 'owner reads workout_blocks');
select is((select count(*) from public.workout_exercises)::bigint, 1::bigint, 'owner reads workout_exercises');
select is((select count(*) from public.workout_logs)::bigint,      1::bigint, 'owner reads workout_logs');
select is((select count(*) from public.week_templates)::bigint,    1::bigint, 'owner reads week_templates');

-- --------------------------------------------------------------------------
-- 13-24. The unlinked stranger is denied on every athlete-owned table
-- --------------------------------------------------------------------------

select pg_temp.act_as('c0de0009-0000-4000-a000-000000000009');

select is((select count(*) from public.goals)::bigint,             0::bigint, 'unlinked user is denied goals');
select is((select count(*) from public.leaks)::bigint,             0::bigint, 'unlinked user is denied leaks');
select is((select count(*) from public.phases)::bigint,            0::bigint, 'unlinked user is denied phases');
select is((select count(*) from public.events)::bigint,            0::bigint, 'unlinked user is denied events');
select is((select count(*) from public.rounds)::bigint,            0::bigint, 'unlinked user is denied rounds');
select is((select count(*) from public.practice_sessions)::bigint, 0::bigint, 'unlinked user is denied practice_sessions');
select is((select count(*) from public.practice_segments)::bigint, 0::bigint, 'unlinked user is denied practice_segments');
select is((select count(*) from public.lessons)::bigint,           0::bigint, 'unlinked user is denied lessons');
select is((select count(*) from public.workout_blocks)::bigint,    0::bigint, 'unlinked user is denied workout_blocks');
select is((select count(*) from public.workout_exercises)::bigint, 0::bigint, 'unlinked user is denied workout_exercises');
select is((select count(*) from public.workout_logs)::bigint,      0::bigint, 'unlinked user is denied workout_logs');
select is((select count(*) from public.week_templates)::bigint,    0::bigint, 'unlinked user is denied week_templates');

-- --------------------------------------------------------------------------
-- 25. tours is the shared catalog: readable by any authenticated user, linked
--     or not.
-- --------------------------------------------------------------------------

select cmp_ok((select count(*) from public.tours)::bigint, '>=', 1::bigint,
  'unlinked authenticated user CAN read the shared tours catalog');

-- --------------------------------------------------------------------------
-- 26-28. The unlinked stranger cannot WRITE athlete-owned data either. An INSERT
--        that fails the WITH CHECK raises 42501 (unlike a filtered SELECT), so we
--        assert the raise on three representative tables — including
--        practice_segments, where a successful write would let a stranger inject
--        minutes into someone else's rollup.
-- --------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.rounds (athlete_id, played_on, course, round_type, holes, par, score)
     values ('a71e7e00-0000-4000-a000-00000000000a', '2026-01-01', 'X', 'tournament', 18, 72, 90) $$,
  '42501',
  'new row violates row-level security policy for table "rounds"',
  'unlinked user cannot insert a round for someone else''s athlete'
);

select throws_ok(
  $$ insert into public.goals (athlete_id, season, metric, target_value)
     values ('a71e7e00-0000-4000-a000-00000000000a', '2025-2026', 'scoring_average', 100) $$,
  '42501',
  'new row violates row-level security policy for table "goals"',
  'unlinked user cannot insert a goal for someone else''s athlete'
);

select throws_ok(
  $$ insert into public.practice_segments (practice_session_id, athlete_id, session_type, minutes)
     values ('50e50000-0000-4000-a000-000000000001',
             'a71e7e00-0000-4000-a000-00000000000a', 'putting', 30) $$,
  '42501',
  'new row violates row-level security policy for table "practice_segments"',
  'unlinked user cannot add a segment to someone else''s practice session'
);

-- --------------------------------------------------------------------------

reset role;
select * from finish();
rollback;
