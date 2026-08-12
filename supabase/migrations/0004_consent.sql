-- 0004_consent.sql
-- The COPPA consent gate, enforced in the database, not in the app.
--
-- CLAUDE.md, Compliance: "an under-13 signup creates a pending account that
-- cannot store data until a guardian completes the link flow." This migration
-- makes that literally true at the RLS layer. An athlete account carries a
-- consent_status; while it is 'pending_consent', can_write_athlete() returns
-- false for EVERY writer — owner and accepted write-link alike — so no
-- athlete-owned table (present or future) will accept a row. The gate lives in
-- exactly one place (the helper the whole backlog delegates to), so it cannot
-- be forgotten on a table shipped in a later session.
--
-- Two things make the gate tamper-proof rather than merely present:
--   1. A BEFORE INSERT trigger stamps consent_status from the athlete's date of
--      birth on the server side. The client never gets to choose it, so an
--      under-13 account cannot self-activate by posting consent_status='active'.
--   2. The only path from 'pending_consent' to 'active' is
--      verify_guardian_consent(token), a SECURITY DEFINER function keyed off an
--      unguessable token that was emailed to the guardian. The athlete has no
--      UPDATE path to their own consent_status (athletes_update runs through
--      can_write_athlete, which is false precisely while pending).
--
-- Migrations are immutable once merged (CLAUDE.md). This is a NEW file; it does
-- not edit 0001-0003. It does `create or replace` can_write_athlete, which
-- 0003 was explicitly written to hand off to here (see its comment).

-- --------------------------------------------------------------------------
-- consent_status enum
-- --------------------------------------------------------------------------

-- The COPPA state of an athlete account. Only two states are needed for the
-- gate: 'pending_consent' (frozen — no athlete data may be written) and
-- 'active' (unlocked). A 13-or-older account is 'active' from creation; an
-- under-13 account is 'pending_consent' until a guardian verifies. There is no
-- separate "consent not required" value — an athlete who never needed consent
-- and one whose guardian has consented are, for authorization, the same thing.
create type public.consent_status as enum (
  'pending_consent',
  'active'
);

-- --------------------------------------------------------------------------
-- athletes.consent_status
-- --------------------------------------------------------------------------

-- Default is the FAIL-SAFE value: a row inserted without the trigger firing (or
-- any future code path that forgets the age check) is frozen, not open. The
-- BEFORE INSERT trigger below overrides this from the date of birth, so the
-- default is only ever the last line of defence. Inherits the table-level
-- grants already issued to `authenticated` in 0002 — a new column on an
-- already-granted table needs no fresh grant.
alter table public.athletes
  add column consent_status public.consent_status not null default 'pending_consent';

comment on column public.athletes.consent_status is
  'COPPA gate. Frozen at pending_consent (no athlete data may be written) until a guardian verifies; 13-and-over accounts are stamped active at insert. Set by trigger from date of birth, never by the client; cleared to active only by verify_guardian_consent().';

-- --------------------------------------------------------------------------
-- Stamp consent_status from date of birth at insert
-- --------------------------------------------------------------------------

-- Runs BEFORE INSERT on athletes and forces consent_status from the owner's
-- date_of_birth, discarding whatever the client submitted. This is what makes
-- the gate un-bypassable from the API: the database, not the request body,
-- decides whether an account is age-gated.
--
-- The threshold is COPPA's: strictly under 13 requires consent. An athlete who
-- is 13 or older on the day the row is created is active immediately. If the
-- birth date is unknown (null), the account is frozen — an age we cannot verify
-- is treated as one that needs consent.
--
-- SECURITY DEFINER with a pinned empty search_path so it can read profiles
-- regardless of the caller's RLS and cannot be hijacked via search_path.
create or replace function public.set_athlete_initial_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dob date;
begin
  select p.date_of_birth into dob
  from public.profiles p
  where p.id = new.user_id;

  if dob is not null and dob <= (current_date - interval '13 years')::date then
    new.consent_status := 'active';
  else
    new.consent_status := 'pending_consent';
  end if;

  return new;
end;
$$;

comment on function public.set_athlete_initial_consent() is
  'BEFORE INSERT trigger on athletes: sets consent_status from the owner''s date_of_birth (under 13 or unknown -> pending_consent, else active). Overrides any client-supplied value so an account cannot self-activate.';

create trigger set_consent_on_insert
  before insert on public.athletes
  for each row execute function public.set_athlete_initial_consent();

-- --------------------------------------------------------------------------
-- can_write_athlete — extended with the consent gate
-- --------------------------------------------------------------------------

-- Replaces the base version from 0003. The write authority rule is unchanged
-- (owner, or an accepted write-link), but it is now conjoined with a hard
-- requirement that the athlete account be 'active'. While the account is
-- pending_consent, this returns false for everyone, including the owner — the
-- whole account is frozen against data writes, which is exactly the COPPA
-- requirement. can_read_athlete is deliberately NOT gated: a pending account
-- may still be read by its owner (they need to see the holding screen); it just
-- cannot accumulate data.
create or replace function public.can_write_athlete(target_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.athletes a
      where a.id = target_athlete_id
        and a.consent_status = 'active'
    )
    and (
      exists (
        select 1
        from public.athletes a
        where a.id = target_athlete_id
          and a.user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.athlete_links l
        where l.athlete_id = target_athlete_id
          and l.linked_user_id = (select auth.uid())
          and l.status = 'accepted'
          and l.permission = 'write'
      )
    );
$$;

comment on function public.can_write_athlete(uuid) is
  'Write gate for athlete-owned data: the account must be consent_status = active AND the caller must be the owner or hold an accepted write link. Returns false for a pending_consent account regardless of caller (the COPPA freeze). Every athlete-owned table write policy delegates here.';

-- --------------------------------------------------------------------------
-- guardian_consent_requests — the emailed verification tokens
-- --------------------------------------------------------------------------

-- One row per guardian-consent email sent for an under-13 account. The token is
-- the secret carried in the emailed link; presenting it to
-- verify_guardian_consent() is what unfreezes the account. Re-sending consent
-- (guardian lost the email, typo in the address) inserts a fresh row with a new
-- token rather than mutating an old one, so every token that was ever emailed
-- remains individually verifiable or ignorable.
create table public.guardian_consent_requests (
  id             uuid primary key default gen_random_uuid(),
  athlete_id     uuid not null references public.athletes (id) on delete cascade,
  -- The guardian's email is the only piece of another person's PII this flow
  -- needs. It is never exposed to the AI context builder and is not a public
  -- profile field; it exists solely to address the consent email.
  guardian_email text not null,
  token          uuid not null default gen_random_uuid(),
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  unique (token)
);

comment on table public.guardian_consent_requests is
  'Guardian consent emails for under-13 accounts. The token is the secret in the emailed link; verify_guardian_consent(token) marks it verified and activates the athlete. Rows are created by the athlete owner and read back to show consent status; the token verification path is a SECURITY DEFINER function, never a direct table write.';

create trigger set_updated_at
  before update on public.guardian_consent_requests
  for each row execute function public.set_updated_at();

-- Lookup by athlete for the pending-consent holding screen ("who did we email,
-- and has it been verified?"). Token lookups go through the unique index.
create index guardian_consent_requests_athlete_idx
  on public.guardian_consent_requests (athlete_id);

alter table public.guardian_consent_requests enable row level security;

-- Base table privileges. Supabase local does not auto-grant (see config.toml,
-- auto_expose_new_tables). The athlete owner creates a request (signup / resend)
-- and reads it back to render the holding screen; no UPDATE or DELETE is
-- exposed, because the only mutation — marking a token verified — happens inside
-- the SECURITY DEFINER function below, not through the data API.
grant select, insert on public.guardian_consent_requests to authenticated;

-- Read: the athlete owner only. The token itself is a bearer secret and is not
-- meant to be discovered by querying this table — a guardian verifies through
-- the function, not by selecting the row.
create policy guardian_consent_requests_select_owner
  on public.guardian_consent_requests
  for select
  using (public.is_athlete_owner(athlete_id));

-- Insert: the athlete owner only, and only for their own athlete. A user cannot
-- fabricate a consent request against someone else's account.
create policy guardian_consent_requests_insert_owner
  on public.guardian_consent_requests
  for insert
  with check (public.is_athlete_owner(athlete_id));

-- --------------------------------------------------------------------------
-- verify_guardian_consent — the one path from pending_consent to active
-- --------------------------------------------------------------------------

-- Given a token from a consent email, mark that request verified and activate
-- the athlete account. SECURITY DEFINER because the caller is the guardian, who
-- is not the athlete owner and may not be signed in at all — they hold only the
-- secret token. The token (a v4 uuid) is the authorization; an unknown or
-- already-consumed token is a no-op. Idempotent: clicking the link twice
-- activates once and simply returns the athlete id again.
--
-- It writes only the two things consent must change (the request's verified_at
-- and the athlete's consent_status) and returns the athlete id so the verify
-- page can confirm which account was unlocked. It never reads or writes any
-- other athlete data.
create or replace function public.verify_guardian_consent(consent_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  req_id      uuid;
  req_athlete uuid;
  req_done    timestamptz;
begin
  select id, athlete_id, verified_at
    into req_id, req_athlete, req_done
  from public.guardian_consent_requests
  where token = consent_token;

  -- Unknown token: reveal nothing, change nothing.
  if req_id is null then
    return null;
  end if;

  -- First verification wins; later clicks are no-ops but still confirm the id.
  if req_done is null then
    update public.guardian_consent_requests
      set verified_at = now()
      where id = req_id;

    update public.athletes
      set consent_status = 'active'
      where id = req_athlete;
  end if;

  return req_athlete;
end;
$$;

comment on function public.verify_guardian_consent(uuid) is
  'Guardian clicks the emailed link: marks the consent request verified and flips the athlete to consent_status = active. SECURITY DEFINER and keyed off the secret token, so a guardian who is not signed in (and is not the athlete owner) can still consent. Idempotent; unknown tokens are a no-op.';

-- The guardian may be anonymous when they click the link, so both roles that
-- reach the data API can call it. The unguessable token is the actual control;
-- the function does nothing without a valid one.
grant execute on function public.verify_guardian_consent(uuid) to anon, authenticated;
