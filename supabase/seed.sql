-- seed.sql
-- The reference athlete — the workbook, reproduced.
--
-- This is not throwaway fixture data. Sessions 7 (stats engine) and 9
-- (dashboard) are only testable if the numbers here are real: a genuine
-- downward scoring trend, leaks that visibly close, a coherent season schedule,
-- and a training plan with weeks and blocks. Everything below reconstructs the
-- 9th-grader-cutting-15-strokes story that the whole product is built around.
--
-- It runs during `supabase db reset` as the postgres superuser, so RLS does not
-- apply — but table TRIGGERS still fire, which matters: inserting the auth user
-- creates the profile (handle_new_user), and inserting the athlete stamps
-- consent_status from the profile's date of birth (set_athlete_initial_consent).
-- The reference athlete is 15, so the account lands `active` and can hold data.
--
-- Everything is wrapped in one DO block so generated ids can be captured into
-- variables and threaded through the cross-references (leaks->goal,
-- events->tours, rounds->events, exercises->blocks, logs->exercises,
-- week_templates->phases) without hand-managing dozens of literal UUIDs.

do $$
declare
  v_user    uuid := '0e57a1e7-0000-4000-a000-000000000001';
  v_email   text := 'athlete@fairway.dev';
  v_athlete uuid;
  v_goal    uuid;
  v_phase1  uuid;
  v_phase2  uuid;
  v_phase3  uuid;
  v_phase4  uuid;
  v_phase5  uuid;
  v_ntpga   uuid;
  v_fwjga   uuid;
  v_tjgt    uuid;
  v_hjgt    uuid;
  v_hs      uuid;
  v_blockA  uuid;
  v_blockB  uuid;
  v_blockC  uuid;
begin

  -- ========================================================================
  -- Auth user + profile
  -- ========================================================================

  -- A usable local-dev login (password: fairway-dev), email pre-confirmed. The
  -- handle_new_user trigger reads this metadata to build the profiles row, so the
  -- display name, role, and date of birth are set exactly the way real signup
  -- would set them. DOB 2010-09-15 makes the athlete 15 -> consent_status active.
  -- The token columns (confirmation_token, recovery_token, email_change, …) are
  -- written as '' rather than left NULL on purpose: GoTrue's Go scanner reads
  -- them into non-nullable strings and errors ("converting NULL to string is
  -- unsupported") on a manually-seeded row that omits them, which silently breaks
  -- password sign-in for this account. Real signups never hit this because GoTrue
  -- writes '' itself; a hand-seeded user has to match that.
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    raw_app_meta_data, raw_user_meta_data
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
    extensions.crypt('fairway-dev', extensions.gen_salt('bf')), now(),
    now(), now(),
    '', '',
    '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'display_name', 'Sam Rivera',
      'role', 'athlete',
      'date_of_birth', '2010-09-15'
    )
  );

  -- The email identity, so password sign-in resolves at the local stack.
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  )
  values (
    extensions.gen_random_uuid(), v_user,
    jsonb_build_object('sub', v_user::text, 'email', v_email),
    'email', v_user::text,
    now(), now(), now()
  );

  -- ========================================================================
  -- Athlete
  -- ========================================================================

  -- A high-school freshman, class of 2029. A 115 shooter carries a high index.
  insert into public.athletes (user_id, level, grad_year, school, home_course, handicap_index)
  values (v_user, 'high_school', 2029, 'Northgate High', 'Diablo Hills GC', 28.4)
  returning id into v_athlete;

  -- ========================================================================
  -- Goal + leaks — the "Start Here" tab
  -- ========================================================================

  insert into public.goals (athlete_id, season, metric, target_value, deadline, baseline_value, why)
  values (
    v_athlete, '2025-2026', 'scoring_average', 100.00, '2026-05-15', 115.00,
    'Make the varsity roster as a sophomore. Coach said the cut line last year was a 100 average over '
    || 'six counting rounds. That is 15 strokes from where I started — and almost none of it is my swing. '
    || 'It is penalties, three-putts, and hero shots. Plug the leaks, earn the spot. Read that again on '
    || 'the days it feels far away.'
  )
  returning id into v_goal;

  -- The four leaks, summing to the 15-stroke gap (5 + 4 + 3 + 3).
  insert into public.leaks (goal_id, athlete_id, name, current_low, current_high, target_value, strokes_saved)
  values
    (v_goal, v_athlete, 'Penalty strokes (OB, lost ball, water)', 6, 10, 2, 5),
    (v_goal, v_athlete, 'Three-putts',                            5,  7, 2, 4),
    (v_goal, v_athlete, 'Chunked / bladed chips',                 4,  6, 2, 3),
    (v_goal, v_athlete, 'Hero shots from trouble',                3,  5, 0, 3);

  -- ========================================================================
  -- Phases — the five-block training year (contiguous, non-overlapping)
  -- ========================================================================

  insert into public.phases (athlete_id, seq, name, starts_on, ends_on, main_job, score_target)
  values (v_athlete, 1, 'Assess & Stabilize', '2025-08-01', '2025-09-15',
          'Stop the big numbers — course management and penalty avoidance', 112)
  returning id into v_phase1;

  insert into public.phases (athlete_id, seq, name, starts_on, ends_on, main_job, score_target)
  values (v_athlete, 2, 'Short Game Base', '2025-09-16', '2025-11-15',
          'Own everything inside 50 yards; end the three-putt', 108)
  returning id into v_phase2;

  insert into public.phases (athlete_id, seq, name, starts_on, ends_on, main_job, score_target)
  values (v_athlete, 3, 'Off-Season Build', '2025-11-16', '2026-01-31',
          'Strength block and a full-swing rebuild in the sim', 105)
  returning id into v_phase3;

  insert into public.phases (athlete_id, seq, name, starts_on, ends_on, main_job, score_target)
  values (v_athlete, 4, 'Sharpen', '2026-02-01', '2026-03-31',
          'Take range gains to the course; scoring shots under pressure', 102)
  returning id into v_phase4;

  insert into public.phases (athlete_id, seq, name, starts_on, ends_on, main_job, score_target)
  values (v_athlete, 5, 'Compete', '2026-04-01', '2026-05-31',
          'Tournament reps at the goal number', 100)
  returning id into v_phase5;

  -- ========================================================================
  -- Tours — the shared catalog
  -- ========================================================================

  insert into public.tours (name, org, format, age_min, age_max, season, membership_cost_cents, entry_fee_cents, region, website)
  values ('NTPGA Medalist Series', 'Northern Texas PGA Junior Tour', '18-hole stroke play', 12, 18, '2025-2026', 15000, 8500, 'North Texas', 'https://ntpga.com/junior')
  returning id into v_ntpga;

  insert into public.tours (name, org, format, age_min, age_max, season, membership_cost_cents, entry_fee_cents, region, website)
  values ('FWJGA Tour', 'Fort Worth Junior Golf Association', '18-hole stroke play', 8, 18, '2025-2026', 10000, 6000, 'Fort Worth', 'https://fwjga.org')
  returning id into v_fwjga;

  insert into public.tours (name, org, format, age_min, age_max, season, membership_cost_cents, entry_fee_cents, region, website)
  values ('Texas Junior Golf Tour', 'TJGT', '36-hole stroke play', 11, 18, '2025-2026', 27500, 17500, 'Texas', 'https://tjgt.org')
  returning id into v_tjgt;

  insert into public.tours (name, org, format, age_min, age_max, season, membership_cost_cents, entry_fee_cents, region, website)
  values ('Hurricane Junior Golf Tour', 'HJGT', 'Multi-round stroke play', 8, 18, '2025-2026', 0, 21900, 'National', 'https://hjgt.org')
  returning id into v_hjgt;

  insert into public.tours (name, org, format, age_min, age_max, season, membership_cost_cents, entry_fee_cents, region, website)
  values ('North Texas High School Series', 'UIL-affiliated', '18-hole stroke play', 14, 18, '2025-2026', 0, 0, 'North Texas', null)
  returning id into v_hs;

  -- ========================================================================
  -- Events — the season schedule
  -- ========================================================================
  --
  -- One event per played tournament (same date as its round, below), plus one
  -- skipped stretch event and two upcoming events. "Today" for this seed is late
  -- summer 2026, so the two fall-2026 events are the athlete's real next events
  -- and give the dashboard's next-event countdown and forward gap something to
  -- render; they are the one bit of forward-looking enrichment beyond the
  -- historical reference season.

  insert into public.events (athlete_id, tour_id, plays_on, name, course, city, holes, entry_fee_cents, priority, status)
  values
    (v_athlete, v_ntpga, '2025-08-09', 'NTPGA Medalist #1',        'Tenison Highlands',  'Dallas',      18, 8500,  'priority', 'played'),
    (v_athlete, v_fwjga, '2025-08-23', 'FWJGA Summer Finale',      'Pecan Valley',       'Fort Worth',  18, 6000,  'optional', 'played'),
    (v_athlete, v_ntpga, '2025-09-13', 'NTPGA Medalist #2',        'Bridlewood',         'Flower Mound',18, 8500,  'priority', 'played'),
    (v_athlete, v_tjgt,  '2025-09-27', 'TJGT Fall Classic',        'The Golf Club Star', 'Frisco',      18, 17500, 'stretch',  'played'),
    (v_athlete, v_fwjga, '2025-10-11', 'FWJGA Fall #1',            'Sky Creek Ranch',    'Keller',      18, 6000,  'optional', 'played'),
    (v_athlete, v_ntpga, '2025-10-25', 'NTPGA Medalist #3',        'Tangle Ridge',       'Grand Prairie',18,8500,  'priority', 'played'),
    (v_athlete, v_hjgt,  '2025-11-08', 'HJGT North Texas Open',    'Coyote Ridge',       'Carrollton',  18, 21900, 'stretch',  'played'),
    (v_athlete, v_hjgt,  '2025-12-06', 'HJGT Winter Series',       'Texas Star',         'Euless',      18, 21900, 'backup',   'skipped'),
    (v_athlete, v_hs,    '2026-02-14', 'HS Preseason Invitational','Riverchase',         'Coppell',     18, 0,     'priority', 'played'),
    (v_athlete, v_tjgt,  '2026-03-07', 'TJGT Spring Open',         'Cowboys GC',         'Grapevine',   18, 17500, 'priority', 'played'),
    (v_athlete, v_fwjga, '2026-03-21', 'FWJGA Spring #1',          'Iron Horse',         'North Richland Hills', 18, 6000, 'optional', 'played'),
    (v_athlete, v_ntpga, '2026-04-11', 'NTPGA Medalist #4',        'Tenison Glen',       'Dallas',      18, 8500,  'priority', 'played'),
    (v_athlete, v_hs,    '2026-05-02', 'District Qualifier',       'Northgate CC',       'Denton',      18, 0,     'priority', 'played'),
    (v_athlete, v_ntpga, '2026-09-05', 'NTPGA Medalist Fall #1',   'Tenison Highlands',  'Dallas',      18, 8500,  'priority', 'registered'),
    (v_athlete, v_fwjga, '2026-10-03', 'FWJGA Fall Opener',        'Pecan Valley',       'Fort Worth',  18, 6000,  'optional', 'not_registered');

  -- ========================================================================
  -- Rounds — the Score Log, the headline data
  -- ========================================================================
  --
  -- Twelve 18-hole TOURNAMENT rounds carry the scoring average and its downward
  -- trend (116 -> 100, with one honest bump). The detail block shows the leaks
  -- closing in step: penalties 9 -> 2, three-putts 6 -> 2. event_id is resolved
  -- by matching the played_on date to the event created above (one per date).
  -- Non-tournament rounds follow, to prove the average excludes them.

  insert into public.rounds (
    athlete_id, event_id, played_on, course, round_type, holes, par, score,
    penalty_strokes, three_putts, total_putts, fairways_hit, fairways_possible,
    greens_in_regulation, up_and_downs, doubles_or_worse, notes
  )
  values
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-08-09'),
       '2025-08-09', 'Tenison Highlands', 'tournament', 18, 72, 116, 9, 6, 38, 4, 14, 2, 1, 8,
       'Two OB off the tee and a water ball. Same story as always — the swing was fine.'),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-08-23'),
       '2025-08-23', 'Pecan Valley', 'tournament', 18, 72, 114, 8, 5, 37, 5, 14, 3, 2, 7, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-09-13'),
       '2025-09-13', 'Bridlewood', 'tournament', 18, 72, 112, 7, 5, 36, 5, 14, 3, 2, 6,
       'Punched out twice instead of going for the hero shot. It worked.'),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-09-27'),
       '2025-09-27', 'The Golf Club Star', 'tournament', 18, 72, 110, 6, 4, 35, 6, 14, 4, 3, 5, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-10-11'),
       '2025-10-11', 'Sky Creek Ranch', 'tournament', 18, 72, 109, 5, 4, 34, 6, 14, 4, 3, 5, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-10-25'),
       '2025-10-25', 'Tangle Ridge', 'tournament', 18, 72, 107, 5, 3, 34, 7, 14, 5, 3, 4, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2025-11-08'),
       '2025-11-08', 'Coyote Ridge', 'tournament', 18, 72, 106, 4, 3, 33, 7, 14, 5, 4, 4, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2026-02-14'),
       '2026-02-14', 'Riverchase', 'tournament', 18, 72, 105, 4, 3, 33, 8, 14, 6, 4, 3,
       'First round back after the off-season build. Putting felt different.'),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2026-03-07'),
       '2026-03-07', 'Cowboys GC', 'tournament', 18, 72, 103, 3, 2, 32, 8, 14, 6, 5, 3, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2026-03-21'),
       '2026-03-21', 'Iron Horse', 'tournament', 18, 72, 104, 3, 3, 32, 8, 14, 6, 4, 3,
       'Windy, cold, a bump in the trend. Kept the doubles down anyway.'),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2026-04-11'),
       '2026-04-11', 'Tenison Glen', 'tournament', 18, 72, 101, 2, 2, 31, 9, 14, 7, 5, 2, null),
    (v_athlete, (select id from public.events where athlete_id = v_athlete and plays_on = '2026-05-02'),
       '2026-05-02', 'Northgate CC', 'tournament', 18, 72, 100, 2, 2, 30, 9, 14, 8, 6, 2,
       'Broke 100 at the qualifier. Exactly the number. Read the why again — earned it.');

  -- Non-tournament rounds: excluded from the scoring average by lib/stats. Their
  -- presence is the test that the exclusion actually works.
  insert into public.rounds (
    athlete_id, event_id, played_on, course, round_type, holes, par, score,
    penalty_strokes, three_putts, total_putts, notes
  )
  values
    (v_athlete, null, '2026-01-20', 'Diablo Hills GC (sim)', 'simulated_tournament', 18, 72, 105, 3, 3, 33,
       'Indoor sim event during the off-season build.'),
    (v_athlete, null, '2026-04-25', 'Diablo Hills GC', 'practice_round', 18, 72, 98, 2, 1, 30,
       'No-pressure practice round with a buddy. Best score yet — does not count toward the average.'),
    (v_athlete, null, '2026-05-05', 'Diablo Hills GC', 'nine_hole', 9, 36, 46, 1, 1, 16, null);

  -- ========================================================================
  -- Practice sessions — weighted the RIGHT way for a 115 shooter
  -- ========================================================================
  --
  -- The workbook's insight: a high shooter should spend most of their time on
  -- short game and putting, not full swing. The mix below is deliberately
  -- short-game / putting heavy so the Session 11 ratio check has something true
  -- to affirm. `exercise` segments mirror the workout logs below so the minutes
  -- rollup stays honest.
  --
  -- A session is a DAY'S BLOCK and its segments are the disciplines inside it
  -- (migration 0010). Most days here are a single discipline, and two — 04-20 and
  -- 04-27 — are the real shape of an in-season day: strength work followed by
  -- time on the green. Fifteen sessions, seventeen segments, 985 minutes.

  -- Each session's segments are attached by date, so the block below reads the
  -- way a training week actually reads.
  insert into public.practice_sessions (athlete_id, occurred_on)
  select v_athlete, d
  from (values
    ('2026-04-06'::date), ('2026-04-07'), ('2026-04-08'), ('2026-04-09'),
    ('2026-04-10'), ('2026-04-13'), ('2026-04-14'), ('2026-04-15'),
    ('2026-04-16'), ('2026-04-18'), ('2026-04-20'), ('2026-04-22'),
    ('2026-04-23'), ('2026-04-27'), ('2026-04-30')
  ) as days(d);

  insert into public.practice_segments
    (practice_session_id, athlete_id, session_type, minutes, focus, drill, result)
  select s.id, v_athlete, seg.session_type, seg.minutes, seg.focus, seg.drill, seg.result
  from (values
    ('2026-04-06'::date, 'putting'::public.session_type,          45, 'Speed control',        'Lag ladder to 20/30/40 ft', '3 of 9 inside the leather'),
    ('2026-04-07', 'short_game',       60, 'Standard chip',        'Up-and-down ladder, 10 balls', '6 of 10 up and down'),
    ('2026-04-08', 'range_wedges',     45, '50-80 yd wedges',      'Distance ladder to numbers', null),
    ('2026-04-09', 'putting',          30, 'Short putts',          '3-6 ft gate drill', 'Made 18 of 20 from 4 ft'),
    ('2026-04-10', 'short_game',       60, 'Bunkers',              'Greenside sand, varied lies', null),
    ('2026-04-13', 'range_full_swing', 45, 'Tempo',                'Half-speed 7-iron flush', null),
    ('2026-04-14', 'putting',          45, 'Lag + short combo',    'Around-the-clock 6 ft', null),
    ('2026-04-15', 'short_game',       75, 'Pitching',             'Trajectory windows, 30-50 yd', 'Good contact all session'),
    ('2026-04-16', 'on_course',       120, 'Scoring shots',        'Play 9, leak scorecard only', '2 penalties, 1 three-putt'),
    ('2026-04-18', 'range_wedges',     45, 'Half wedges',          'Clock system 30/60/90', null),
    -- A two-part day: lift, then putt.
    ('2026-04-20', 'exercise',         50, 'Strength — Block C',   'In-season maintenance session', null),
    ('2026-04-20', 'putting',          30, 'Speed',                'Distance-only, no hole', null),
    ('2026-04-22', 'short_game',       60, 'Chip + run',           'Bump-and-run to back pins', null),
    ('2026-04-23', 'range_full_swing', 60, 'Driver',               'Fairway finder, 3/4 driver', 'Started the tee-ball routine'),
    -- And another.
    ('2026-04-27', 'exercise',         50, 'Strength — Block C',   'In-season maintenance session', null),
    ('2026-04-27', 'short_game',       45, 'Green reading',        'AimPoint express, 10 putts', null),
    ('2026-04-30', 'on_course',       120, 'Course management',    'Play 18, punch out every time', 'Zero hero shots. Zero.')
  ) as seg(occurred_on, session_type, minutes, focus, drill, result)
  join public.practice_sessions s
    on s.athlete_id = v_athlete and s.occurred_on = seg.occurred_on;

  -- ========================================================================
  -- Lessons
  -- ========================================================================

  insert into public.lessons (athlete_id, coach_name, occurred_on, swing_key, drill_assigned, homework_target, homework_done, cost_cents, what_changed)
  values
    (v_athlete, 'Coach Diaz', '2025-11-20', 'Steeper shoulder turn, quieter hips',
       'Pause-at-top drill, 20 reps a day', '5 sessions before next lesson', 'yes', 9000,
       'Backswing got shorter and more connected. Contact improved right away.'),
    (v_athlete, 'Coach Diaz', '2026-01-15', 'Wedge low-point control',
       'Towel-under-ball chipping, daily', '10 short-game sessions', 'partly', 9000,
       'Chunked chips almost gone. Still bailing on the longer pitches.'),
    (v_athlete, 'Coach Diaz', '2026-03-12', 'Putter face square at impact',
       'Gate drill from 4 ft, 20 makes', 'Every practice for 3 weeks', 'yes', 9000,
       'Three-putts down to two a round. Speed is the last piece.'),
    -- The most recent lesson, and the only one still carrying homework. Its
    -- status is deliberately NULL — "not answered yet", which is a different fact
    -- from "no" — so the dashboard's outstanding-homework card has something real
    -- to show, and the difference between the two states is exercised end to end.
    -- The 2026-04-23 practice session ("Started the tee-ball routine") is the
    -- athlete beginning this drill two days later.
    (v_athlete, 'Coach Diaz', '2026-04-21', 'Same tee-ball routine every time',
       'Three-step routine behind the ball, then commit', 'Every tee shot for 4 rounds', null, 9000,
       'Nothing swing-wise. This one is all pre-shot — the misses are decisions, not mechanics.');

  -- ========================================================================
  -- Strength program — three blocks with exercise lists
  -- ========================================================================

  insert into public.workout_blocks (athlete_id, name, starts_on, ends_on, sessions_per_week, minutes_per_session)
  values (v_athlete, 'Block A — Foundation', '2025-11-16', '2025-12-31', 3, 45)
  returning id into v_blockA;

  insert into public.workout_blocks (athlete_id, name, starts_on, ends_on, sessions_per_week, minutes_per_session)
  values (v_athlete, 'Block B — Power', '2026-01-01', '2026-02-15', 3, 50)
  returning id into v_blockB;

  insert into public.workout_blocks (athlete_id, name, starts_on, ends_on, sessions_per_week, minutes_per_session)
  values (v_athlete, 'Block C — In-Season Maintain', '2026-02-16', '2026-05-31', 2, 40)
  returning id into v_blockC;

  insert into public.workout_exercises (block_id, athlete_id, part, name, sets, reps, coaching_note)
  values
    (v_blockA, v_athlete, 'warmup',   'Dynamic warm-up flow',      1, '8 min',         'Raise heart rate, open hips and t-spine.'),
    (v_blockA, v_athlete, 'strength', 'Goblet squat',              3, '3 x 8',         'Sit between the heels, chest tall.'),
    (v_blockA, v_athlete, 'strength', 'Trap-bar deadlift',         3, '3 x 6',         'Push the floor away; neutral spine.'),
    (v_blockA, v_athlete, 'power',    'Med-ball rotational throw', 3, '3 x 5 each',    'Turn through the lead hip; mirror the swing.'),
    (v_blockA, v_athlete, 'core',     'Half-kneeling Pallof press',3, '3 x 10 each',   'Resist the rotation; ribs down.'),
    (v_blockA, v_athlete, 'mobility', '90/90 hip switch',          2, '2 x 8 each',    'Slow and controlled, no forcing.'),

    (v_blockB, v_athlete, 'warmup',   'Jump-rope + band series',   1, '6 min',         'Prime the nervous system.'),
    (v_blockB, v_athlete, 'power',    'Box jump',                  4, '4 x 3',         'Land soft; reset every rep.'),
    (v_blockB, v_athlete, 'power',    'Med-ball slam',             4, '4 x 5',         'Full extension, violent finish.'),
    (v_blockB, v_athlete, 'strength', 'Front squat',               4, '4 x 4',         'Elbows high; brace hard.'),
    (v_blockB, v_athlete, 'strength', 'Single-leg RDL',            3, '3 x 6 each',    'Hips square; slow eccentric.'),
    (v_blockB, v_athlete, 'core',     'Cable chop',                3, '3 x 10 each',   'Rotate the trunk, not the arms.'),

    (v_blockC, v_athlete, 'warmup',   'Mobility + activation',     1, '6 min',         'Enough to feel ready, no fatigue.'),
    (v_blockC, v_athlete, 'power',    'Rotational med-ball toss',  3, '3 x 4 each',    'Quality over quantity in-season.'),
    (v_blockC, v_athlete, 'strength', 'Goblet squat',              2, '2 x 6',         'Crisp reps; leave two in the tank.'),
    (v_blockC, v_athlete, 'strength', 'Trap-bar deadlift',         2, '2 x 4',         'Light and fast, never grindy.'),
    (v_blockC, v_athlete, 'core',     'Side plank',                2, '2 x 30s each',  'Stack the hips; breathe.'),
    (v_blockC, v_athlete, 'mobility', 'Thoracic openers',          2, '2 x 8 each',    'Protect the rotation for the swing.');

  -- A few logged in-season sessions (Block C), matching the exercise practice
  -- sessions above by date so the two views agree.
  insert into public.workout_logs (athlete_id, exercise_id, performed_on, sets_done, reps_done, load)
  values
    (v_athlete, (select id from public.workout_exercises where athlete_id = v_athlete and block_id = v_blockC and name = 'Goblet squat'),       '2026-04-20', 2, 6,  '35 lb'),
    (v_athlete, (select id from public.workout_exercises where athlete_id = v_athlete and block_id = v_blockC and name = 'Trap-bar deadlift'),  '2026-04-20', 2, 4,  '135 lb'),
    (v_athlete, (select id from public.workout_exercises where athlete_id = v_athlete and block_id = v_blockC and name = 'Side plank'),         '2026-04-20', 2, 30, 'bodyweight'),
    (v_athlete, (select id from public.workout_exercises where athlete_id = v_athlete and block_id = v_blockC and name = 'Goblet squat'),       '2026-04-27', 2, 6,  '40 lb'),
    (v_athlete, (select id from public.workout_exercises where athlete_id = v_athlete and block_id = v_blockC and name = 'Trap-bar deadlift'),  '2026-04-27', 2, 4,  '145 lb');

  -- ========================================================================
  -- Week templates — the weekly plan for two phases (ISO days: 1=Mon..7=Sun)
  -- ========================================================================

  insert into public.week_templates (phase_id, athlete_id, day_of_week, activity, minutes, detail)
  values
    -- Phase 2 — Short Game Base
    (v_phase2, v_athlete, 1, 'Short game',     60,  'Chipping and pitching around the green.'),
    (v_phase2, v_athlete, 2, 'Putting',        45,  'Speed control focus, lag ladder.'),
    (v_phase2, v_athlete, 3, 'Range wedges',   60,  'Distance wedges to numbers.'),
    (v_phase2, v_athlete, 4, 'Short game',     60,  'Bunkers and awkward lies.'),
    (v_phase2, v_athlete, 5, 'Putting',        30,  'Short putts under pressure.'),
    (v_phase2, v_athlete, 6, 'On-course',     120,  'Play 18; track three-putts on the leak card.'),
    (v_phase2, v_athlete, 7, 'Rest / mobility',20,  'Light mobility, no golf.'),
    -- Phase 3 — Off-Season Build
    (v_phase3, v_athlete, 1, 'Strength — Block',           50,  'Workout block session (see Strength).'),
    (v_phase3, v_athlete, 2, 'Wedges & short game',        75,  '50 wedge balls plus an up-and-down ladder.'),
    (v_phase3, v_athlete, 3, 'Putting',                    45,  'Lag ladder and the 3-6 ft gate drill.'),
    (v_phase3, v_athlete, 4, 'Strength — Block',           50,  'Workout block session (see Strength).'),
    (v_phase3, v_athlete, 5, 'Full swing (sim)',           60,  'Rebuild work on the launch monitor.'),
    (v_phase3, v_athlete, 6, 'On-course / simulated round',120, '9-18 holes; keep the leak scorecard.'),
    (v_phase3, v_athlete, 7, 'Rest / mobility',            20,  'Light mobility, no golf.');

end $$;
