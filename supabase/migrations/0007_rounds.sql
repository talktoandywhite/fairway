-- 0007_rounds.sql
-- Rounds — the Score Log, the most important data in the product.
--
-- One recorded playing session. Only 18-hole `tournament` rounds feed the
-- headline scoring average (the stats engine in Session 7 enforces that; the
-- table stores every type). The design principle that shapes this schema is
-- progressive disclosure: a ten-year-old logs score and penalties; a college
-- player logs the full detail block. So the six identifying/scoring columns are
-- NOT NULL and everything else — the leak-measuring detail stats — is nullable,
-- because a round with only a score is a valid, useful round.

create table public.rounds (
  id                    uuid primary key default gen_random_uuid(),
  athlete_id            uuid not null references public.athletes (id) on delete cascade,
  -- Optionally the event this round was played at; nulled if the event is
  -- deleted, so the round (and the scoring average) survives.
  event_id              uuid references public.events (id) on delete set null,
  -- Required, minimal core — the 60-second parking-lot form (Session 8).
  played_on             date not null,
  course                text not null,
  round_type            public.round_type not null,
  holes                 smallint not null,
  par                   smallint not null,
  score                 smallint not null,
  -- Optional detail block (progressive disclosure). Nullable by deliberate
  -- exception to the not-null default: "not recorded" is a real, common state
  -- and must be distinguishable from zero — a round with null three_putts is not
  -- a round with zero three-putts, and the averages in lib/stats treat them
  -- differently.
  penalty_strokes       smallint,
  three_putts           smallint,
  total_putts           smallint,
  fairways_hit          smallint,
  fairways_possible     smallint,
  greens_in_regulation  smallint,
  up_and_downs          smallint,
  doubles_or_worse      smallint,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  constraint rounds_holes_ok check (holes in (9, 18)),
  constraint rounds_par_ok   check (par > 0),
  constraint rounds_score_ok check (score > 0)
);

comment on table public.rounds is
  'One recorded playing session. Core scoring columns are required; the detail (leak) stats are nullable so a minimal round is valid. Only 18-hole tournament rounds feed scoring average — enforced in lib/stats, not here. Athlete-owned; RLS delegates to the helpers.';

comment on column public.rounds.three_putts is
  'Nullable on purpose: null means "not recorded", which the stats engine treats differently from zero. Same for every column in the detail block.';

create trigger set_updated_at
  before update on public.rounds
  for each row execute function public.set_updated_at();

-- The dashboard and stats engine read an athlete's rounds newest-first; this is
-- the hot index called out in the backlog.
create index rounds_athlete_played_on_idx on public.rounds (athlete_id, played_on desc);

alter table public.rounds enable row level security;

grant select, insert, update, delete on public.rounds to authenticated;

create policy rounds_select on public.rounds
  for select using (public.can_read_athlete(athlete_id));
create policy rounds_insert on public.rounds
  for insert with check (public.can_write_athlete(athlete_id));
create policy rounds_update on public.rounds
  for update using (public.can_write_athlete(athlete_id))
  with check (public.can_write_athlete(athlete_id));
create policy rounds_delete on public.rounds
  for delete using (public.can_write_athlete(athlete_id));
