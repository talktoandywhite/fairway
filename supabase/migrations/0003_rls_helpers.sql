-- 0003_rls_helpers.sql
-- The two authorization primitives every athlete-owned table delegates to, plus
-- the RLS policies for athletes and athlete_links that are their first callers.
--
-- Getting these functions right is the highest-leverage work in the backlog
-- (CLAUDE.md / BACKLOG). From Session 6 onward, every athlete-owned table's
-- policy is a one-liner: `using (public.can_read_athlete(athlete_id))` /
-- `with check (public.can_write_athlete(athlete_id))`. If the rule ever changes,
-- it changes in exactly one place.
--
-- Why SECURITY DEFINER: the functions read athlete_links (and athletes), which
-- themselves have RLS. A plain (invoker-rights) function evaluated inside a
-- policy would re-enter RLS on those reads and can recurse. Running as the
-- definer reads the join tables directly, with a pinned empty search_path and
-- fully-qualified names so the elevated context cannot be hijacked. The
-- functions are STABLE (they only read) and leak nothing but a boolean derived
-- from the caller's own auth.uid().

-- --------------------------------------------------------------------------
-- is_athlete_owner — the ownership primitive
-- --------------------------------------------------------------------------

-- True when the current user IS the athlete (owns the athletes row). Ownership
-- is the one grant that no link can confer and no link can revoke: it gates
-- deleting the athlete and managing that athlete's links.
create or replace function public.is_athlete_owner(target_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes a
    where a.id = target_athlete_id
      and a.user_id = (select auth.uid())
  );
$$;

comment on function public.is_athlete_owner(uuid) is
  'True when the current user owns the athletes row. The ownership primitive behind link management and athlete deletion.';

-- --------------------------------------------------------------------------
-- can_read_athlete — read authorization
-- --------------------------------------------------------------------------

-- True when the current user owns the athlete OR holds an accepted link of any
-- permission. This is the read gate for every athlete-owned table.
create or replace function public.can_read_athlete(target_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes a
    where a.id = target_athlete_id
      and a.user_id = (select auth.uid())
  ) or exists (
    select 1
    from public.athlete_links l
    where l.athlete_id = target_athlete_id
      and l.linked_user_id = (select auth.uid())
      and l.status = 'accepted'
  );
$$;

comment on function public.can_read_athlete(uuid) is
  'Read gate for athlete-owned data: true for the owner or any accepted link. Every athlete-owned table SELECT policy delegates here.';

-- --------------------------------------------------------------------------
-- can_write_athlete — write authorization
-- --------------------------------------------------------------------------

-- True when the current user owns the athlete OR holds an accepted link whose
-- permission is 'write'. This is the write gate for every athlete-owned table.
--
-- Session 5 will extend this to return false for an athlete in a
-- pending_consent state (the COPPA gate enforced at the RLS layer, not just the
-- UI). That change belongs to 0004_consent.sql; this is the base rule.
create or replace function public.can_write_athlete(target_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes a
    where a.id = target_athlete_id
      and a.user_id = (select auth.uid())
  ) or exists (
    select 1
    from public.athlete_links l
    where l.athlete_id = target_athlete_id
      and l.linked_user_id = (select auth.uid())
      and l.status = 'accepted'
      and l.permission = 'write'
  );
$$;

comment on function public.can_write_athlete(uuid) is
  'Write gate for athlete-owned data: true for the owner or an accepted write link. Every athlete-owned table write policy delegates here. Session 5 extends it for the pending_consent gate.';

-- --------------------------------------------------------------------------
-- athletes policies
-- --------------------------------------------------------------------------

-- Read: owner or any accepted link.
create policy athletes_select
  on public.athletes
  for select
  using (public.can_read_athlete(id));

-- Insert: a user may create only their own athlete row. Ownership cannot be
-- conferred by anyone else, so this does not go through the helpers.
create policy athletes_insert_own
  on public.athletes
  for insert
  with check (user_id = (select auth.uid()));

-- Update: owner or an accepted write link. `id` is the immutable primary key, so
-- checking the same id in USING and WITH CHECK keeps the row within the caller's
-- write authority across the update.
create policy athletes_update
  on public.athletes
  for update
  using (public.can_write_athlete(id))
  with check (public.can_write_athlete(id));

-- Delete: owner only. Deleting an athlete cascades to all their data; a linked
-- coach or parent must never be able to do it, regardless of write permission.
create policy athletes_delete_own
  on public.athletes
  for delete
  using (public.is_athlete_owner(id));

-- --------------------------------------------------------------------------
-- athlete_links policies
-- --------------------------------------------------------------------------

-- Read: the athlete who owns the link, or the user on the other end of it. Both
-- parties can see a link that involves them; no one else can.
create policy athlete_links_select
  on public.athlete_links
  for select
  using (
    public.is_athlete_owner(athlete_id)
    or linked_user_id = (select auth.uid())
  );

-- Insert / update / delete: the athlete owner only, in the MVP. The athlete
-- controls who has access to their data and at what permission. The linked
-- user's accept/decline path is deliberately NOT a direct table write here — it
-- arrives in Session 16 as a token-based flow, so a recipient can never edit a
-- link's permission or silently accept one they were not offered.
create policy athlete_links_insert_owner
  on public.athlete_links
  for insert
  with check (public.is_athlete_owner(athlete_id));

create policy athlete_links_update_owner
  on public.athlete_links
  for update
  using (public.is_athlete_owner(athlete_id))
  with check (public.is_athlete_owner(athlete_id));

create policy athlete_links_delete_owner
  on public.athlete_links
  for delete
  using (public.is_athlete_owner(athlete_id));
