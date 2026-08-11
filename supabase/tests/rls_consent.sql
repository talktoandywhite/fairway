-- rls_consent.sql
-- pgTAP proof of the COPPA consent gate added in 0004_consent.sql.
--
-- The compliance requirement (CLAUDE.md, Compliance): an under-13 account must
-- not be able to write athlete data until a guardian consents, and the gate
-- must live in RLS, not just the UI. There is no rounds table yet (Session 6),
-- so the proof is at the exact seam every future athlete-owned table delegates
-- to: can_write_athlete(), plus the one athlete-owned write that already exists
-- through RLS today — UPDATE on the athletes row itself.
--
-- Run with `pnpm test:rls` (supabase test db) against the local stack.
--
-- Method mirrors rls_identity.sql: seed as the superuser test role (bypasses
-- RLS, but table TRIGGERS still fire — which is the point for the age stamp),
-- then drop to `authenticated` and drive auth.uid() via request.jwt.claims.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(13);

-- --------------------------------------------------------------------------
-- Fixtures
-- --------------------------------------------------------------------------

-- Users, with date_of_birth carried in signup metadata so handle_new_user
-- writes it onto profiles (exactly as the real signup flow does).
--   child   — born well under 13 years ago -> must land pending_consent
--   adult   — born over 13 years ago       -> must land active immediately
--   coach   — an accepted write-link on the child, to prove the freeze applies
--             to linked writers too, not only the owner
--   guard   — stands in for a signed-in guardian (not used to authorize; the
--             token does that)
insert into auth.users (id, aud, role, email, raw_user_meta_data)
values
  ('c1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
     'child@test.dev',  '{"date_of_birth":"2018-06-01"}'::jsonb),
  ('a2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
     'adult@test.dev',  '{"date_of_birth":"1998-06-01"}'::jsonb),
  ('c3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated',
     'coach@test.dev',  '{}'::jsonb);

-- The under-13 athlete. We deliberately try to insert consent_status = 'active'
-- to prove the BEFORE INSERT trigger overrides a hostile client and freezes it.
insert into public.athletes (id, user_id, level, consent_status)
values ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'c1111111-1111-1111-1111-111111111111', 'junior', 'active');

-- The 13-or-older athlete, inserted the honest way (no consent_status given).
insert into public.athletes (id, user_id, level)
values ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'a2222222-2222-2222-2222-222222222222', 'college');

-- An accepted WRITE link from the child athlete to the coach. Under a normal
-- (active) account this would let the coach write; here it must not, because
-- the account is frozen.
insert into public.athlete_links (athlete_id, linked_user_id, relationship, permission, status)
values ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'c3333333-3333-3333-3333-333333333333', 'coach', 'write', 'accepted');

-- A guardian consent request for the child, with a known token so we can verify
-- it below the way the emailed link would.
insert into public.guardian_consent_requests (athlete_id, guardian_email, token)
values ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'parent@test.dev',
        'deadbeef-0000-0000-0000-000000000000');

-- --------------------------------------------------------------------------
-- 1-2. The age stamp is server-decided, not client-decided
-- --------------------------------------------------------------------------

-- 1. The child landed pending_consent even though the insert asked for 'active'.
select is(
  (select consent_status::text from public.athletes
     where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'pending_consent',
  'under-13 athlete is stamped pending_consent, overriding the client value'
);

-- 2. The adult account is active from creation with no consent step.
select is(
  (select consent_status::text from public.athletes
     where id = '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'active',
  '13-or-older athlete is stamped active at insert'
);

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
-- 3-6. While pending_consent, nobody can write the child's data
-- --------------------------------------------------------------------------

-- 3. The owner cannot write their own frozen account (helper says no).
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select ok(
  not public.can_write_athlete('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'owner cannot write while pending_consent (can_write_athlete is false)'
);

-- 4. And that is a real RLS effect, not just a boolean: the owner's UPDATE on
--    the athletes row is filtered to zero rows.
with upd as (
  update public.athletes set handicap_index = 9.9
  where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 0::bigint,
  'owner UPDATE on a pending_consent athlete is blocked by RLS')
from upd;

-- 5. The accepted WRITE-link coach is frozen out too — the gate is on the
--    account, not on the caller.
select pg_temp.act_as('c3333333-3333-3333-3333-333333333333');
select ok(
  not public.can_write_athlete('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'accepted write-link coach cannot write while the account is pending_consent'
);

-- 6. The owner can still READ the account (needed for the holding screen);
--    reads are not gated by consent.
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
select is(
  (select count(*) from public.athletes
     where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::bigint,
  1::bigint,
  'owner can still read their own pending_consent athlete'
);

-- --------------------------------------------------------------------------
-- 7-8. The adult account is not frozen — the gate is a gate, not a wall
-- --------------------------------------------------------------------------

select pg_temp.act_as('a2222222-2222-2222-2222-222222222222');
select ok(
  public.can_write_athlete('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'active (13+) owner can write'
);

with upd as (
  update public.athletes set handicap_index = 4.2
  where id = '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 1::bigint,
  'active owner UPDATE on their athletes row succeeds')
from upd;

-- --------------------------------------------------------------------------
-- 9. A bad token changes nothing
-- --------------------------------------------------------------------------

-- Back to superuser so we exercise the function directly (it is SECURITY
-- DEFINER, so the role does not affect its internals; reset role keeps the test
-- honest about what the function itself enforces).
reset role;

select is(
  public.verify_guardian_consent('00000000-0000-0000-0000-000000000000'::uuid),
  null,
  'an unknown consent token verifies nothing and returns null'
);
select is(
  (select consent_status::text from public.athletes
     where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'pending_consent',
  'the child account is still frozen after a bad token'
);

-- --------------------------------------------------------------------------
-- 10-12. Guardian consent unfreezes the account, and writes then work
-- --------------------------------------------------------------------------

-- 10. The real token flips the account active and returns its athlete id.
select is(
  public.verify_guardian_consent('deadbeef-0000-0000-0000-000000000000'::uuid),
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'a valid guardian token returns the athlete id it activated'
);
select is(
  (select consent_status::text from public.athletes
     where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'active',
  'the child account is active after guardian consent'
);

-- 12. And now the owner can actually write — the same write that was blocked in
--     assertion 4 now succeeds through RLS.
set local role authenticated;
select pg_temp.act_as('c1111111-1111-1111-1111-111111111111');
with upd as (
  update public.athletes set handicap_index = 20.0
  where id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  returning 1
)
select is(count(*)::bigint, 1::bigint,
  'after consent, the owner UPDATE that RLS blocked while pending now succeeds')
from upd;

-- --------------------------------------------------------------------------

reset role;
select * from finish();
rollback;
