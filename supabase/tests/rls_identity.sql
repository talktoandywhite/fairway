-- rls_identity.sql
-- pgTAP proof that the identity RLS foundation (0002 + 0003) enforces the rule
-- in CLAUDE.md: an athlete's data is visible only to the athlete and to users
-- with an ACCEPTED link, at the permission that link specifies, and to nobody
-- else.
--
-- Run with `pnpm test:rls` (supabase test db) against the local stack.
--
-- Method: seed auth users, one athlete, and three links as the superuser test
-- role (which bypasses RLS). Then drop to the `authenticated` role and, by
-- setting request.jwt.claims->>'sub' to each user's id, assert what that user
-- can and cannot see or change through RLS. auth.uid() reads that claim.

begin;

-- pgTAP lives in the extensions schema on Supabase; make its functions callable
-- unqualified and keep public reachable for our own objects.
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- --------------------------------------------------------------------------
-- Fixtures (seeded as superuser; RLS does not apply here)
-- --------------------------------------------------------------------------

-- Five users. Inserting into auth.users fires handle_new_user, which creates the
-- matching profiles row; email is required so the display_name fallback is not
-- null.
insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'owner@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'reader@test.dev'),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'writer@test.dev'),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'pending@test.dev'),
  ('55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'stranger@test.dev');

-- The athlete, owned by user #1.
insert into public.athletes (id, user_id, level, handicap_index)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111', 'high_school', 12.0);

-- Links: an accepted read link, an accepted write link, and a pending link.
insert into public.athlete_links (athlete_id, linked_user_id, relationship, permission, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'parent', 'read',  'accepted'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'coach',  'write', 'accepted'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'coach',  'read',  'pending');

-- --------------------------------------------------------------------------
-- Become a normal authenticated user; switch identity by changing the JWT sub
-- --------------------------------------------------------------------------

set local role authenticated;

-- A tiny helper: set the current user for the assertions that follow.
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
-- Reads
-- --------------------------------------------------------------------------

-- 1. Owner reads their own athlete.
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*) from public.athletes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  1::bigint,
  'owner can read own athlete'
);

-- 2. Accepted read-link user reads the athlete.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*) from public.athletes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  1::bigint,
  'accepted read-link user can read the athlete'
);

-- 3. Accepted write-link user reads the athlete.
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
select is(
  (select count(*) from public.athletes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  1::bigint,
  'accepted write-link user can read the athlete'
);

-- 4. Pending-link user is denied (the link is not yet accepted).
select pg_temp.act_as('44444444-4444-4444-4444-444444444444');
select is(
  (select count(*) from public.athletes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  0::bigint,
  'pending-link user is denied read'
);

-- 5. Unlinked user is denied.
select pg_temp.act_as('55555555-5555-5555-5555-555555555555');
select is(
  (select count(*) from public.athletes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  0::bigint,
  'unlinked user is denied read'
);

-- --------------------------------------------------------------------------
-- Writes
-- --------------------------------------------------------------------------

-- 6. Read-permission link cannot write. A failing UPDATE affects zero rows
--    (RLS filters the row out of the USING set) rather than raising.
select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
with upd as (
  update public.athletes set handicap_index = 99.9
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 0::bigint, 'read-permission link cannot update the athlete')
from upd;

-- 7. Accepted write-link user CAN write (proves the gate is a gate, not a wall).
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
with upd as (
  update public.athletes set handicap_index = 10.5
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 1::bigint, 'accepted write-link user can update the athlete')
from upd;

-- 8. A linked user (even with write) cannot DELETE the athlete — delete is
--    owner-only, so the cascade can never be triggered by a coach or parent.
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
with del as (
  delete from public.athletes
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 0::bigint, 'write-link user cannot delete the athlete')
from del;

-- --------------------------------------------------------------------------

reset role;
select * from finish();
rollback;
