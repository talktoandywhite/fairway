# Fairway

**A development platform for competitive golfers, from junior tours through college.**

Fairway turns the work of getting better at golf — the schedule, the practice, the lessons, the gym,
and above all the honest scorekeeping — into one place that answers a single question:

> Am I getting there?

---

## Where this came from

Fairway began as a spreadsheet: an 8-tab workbook built for a 9th grader trying to cut 15 strokes off
a 115 scoring average in ten months to make his high school roster. The workbook worked because it
was built around an unglamorous truth:

**A golfer shooting 115 is not losing 15 strokes to a bad swing. They are losing them to penalties,
three-putts, chunked chips, and hero shots that don't come off.**

That workbook broke the gap down like this:

| Leak | Typical for a 113–117 shooter | Realistic target | Strokes saved |
|---|---|---|---|
| Penalty strokes (OB, lost ball, water) | 6–10 per round | 2 or fewer | 5 |
| Three-putts | 5–7 per round | 2 or fewer | 4 |
| Chunked / bladed chips | 4–6 wasted shots | 1–2 | 3 |
| Hero shots from trouble | 3–5 per round | Punch out, take medicine | 3 |
| | | | **15** |

Fifteen strokes, without hitting the ball any better. Lessons build the swing for the long run;
the score drops this year come from plugging leaks.

Fairway's job is to make those leaks impossible to ignore, for any athlete, at any level. The eight
tabs of the original workbook are the eight domains of the app.

---

## From workbook to application

| Workbook tab | Becomes | What changes |
|---|---|---|
| **Start Here** | Goals & Gap Analysis | Editable goal with a live gap calculation instead of a static number; leak table becomes a tracked, per-round-measured breakdown |
| **Tournament Plan** | Schedule | Gap-day warnings become notifications; entry-fee budget rolls up per season; registration status drives reminders |
| **Tour Options** | Tour Catalog | A shared, community-maintained catalog filtered by the athlete's location, age, and budget — not a hand-typed list |
| **Score Log** | Rounds | Fast mobile entry; the stats block becomes the dashboard |
| **Weekly Schedule** | Training Plan | Phase-aware weekly template that generates the actual week and checks off against the Practice Log |
| **Workout Plan** | Strength Program | Blocks with exercise library, set/rep logging, and block transitions on schedule |
| **Practice Log** | Practice | Minutes-by-type tracking against a healthy ratio target |
| **Lesson Log** | Lessons | Shared with the coach, who can write the entry and assign the drill directly |

---

## Who it's for

- **Athletes (8–22)** — own their data and drive their own plan. The product has to work for a
  ten-year-old on a junior tour and still hold a college player's attention.
- **Parents / guardians** — linked access to their athlete. Manage schedule, registrations, and cost.
  For athletes under 13, a verified guardian link is required before the account can store data.
- **Coaches** — invited, per-athlete access. Write lesson notes, assign drills, see whether the
  homework actually got done.

Teams and program-wide coach dashboards are planned for V2. The schema is designed for them from day
one so the team layer is additive rather than a rewrite.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js App Router (TypeScript, React Server Components)│
│  ├── (auth)  sign-in, sign-up, guardian consent flow     │
│  └── (app)   dashboard, rounds, schedule, practice,      │
│              lessons, training, strength, settings       │
│         Server Actions for all mutations                 │
└──────────────────────────┬──────────────────────────────┘
                           │  @supabase/ssr
┌──────────────────────────▼──────────────────────────────┐
│  Supabase                                                │
│  ├── Auth          email + magic link, guardian consent   │
│  ├── Postgres      domain tables, enums, triggers         │
│  ├── RLS           the authorization layer — not optional │
│  └── Storage       lesson media (post-MVP), private only  │
└─────────────────────────────────────────────────────────┘
```

**Authorization is Row Level Security.** Access is granted by an accepted row in `athlete_links`, at
the permission level that row specifies. There is no service-role query path in user-facing code.
Application-layer filtering is a convenience, never a control.

**The AI coach narrates; it does not decide.** A deterministic layer — the stats engine, the plan
engine, and a human-authored content library — determines what the athlete should do. The LLM phrases
it for their age and their coach's style, then passes through moderation and a mechanical grounding
check before it renders. Every AI surface has a deterministic fallback, and the app is fully usable
with the AI layer switched off. Full design in [`AI_COACH.md`](./AI_COACH.md).

**The design system is enforced, not suggested.** The Clubhouse theme — warm parchment, fairway
green, serif display type, monospaced figures — ships as validated tokens in `globals.css`. Every
color pair meets WCAG AA and every chart slot is colorblind-validated in both modes, with CI checks
that fail the build on a regression. Full spec in [`DESIGN.md`](./DESIGN.md).

**Derived metrics are pure functions.** Scoring average, gap days, strokes to goal, and minutes-by-type
live in tested functions in `lib/stats/`, ported directly from the workbook formulas — including their
edge cases. They graduate to materialized views only when performance demands it, and the pure
function remains the reference implementation.

---

## Data model

Core entities, abbreviated:

```
profiles              id → auth.users, display_name, role, date_of_birth
athletes              user_id, level, grad_year, school, home_course, handicap_index
athlete_links         athlete_id, linked_user_id, relationship, permission, status, team_id?
                      └─ the join that drives every RLS policy

goals                 athlete_id, season, metric, target_value, deadline, baseline_value, why
leaks                 goal_id, name, current_low, current_high, target_value, strokes_saved
phases                athlete_id, seq, name, starts_on, ends_on, main_job, score_target

tours                 name, org, format, age_min, age_max, season, membership_cost_cents,
                      entry_fee_cents, region, website          [shared catalog]
events                athlete_id, tour_id?, plays_on, name, course, city, holes,
                      entry_fee_cents, priority, status, notes

rounds                athlete_id, event_id?, played_on, course, round_type, holes, par, score,
                      penalty_strokes, three_putts, total_putts, fairways_hit, fairways_possible,
                      greens_in_regulation, up_and_downs, doubles_or_worse, notes

practice_sessions     athlete_id, occurred_on, session_type, minutes, focus, drill, result, notes
lessons               athlete_id, coach_user_id?, coach_name, occurred_on, swing_key,
                      drill_assigned, homework_target, homework_done, cost_cents, what_changed

workout_blocks        athlete_id, name, starts_on, ends_on, sessions_per_week, minutes_per_session
workout_exercises     block_id, part, name, sets, reps, coaching_note
workout_logs          athlete_id, exercise_id, performed_on, sets_done, reps_done, load

week_templates        phase_id, day_of_week, activity, minutes, detail
```

**Enums**, carried over verbatim from the workbook:

- `round_type` — `tournament`, `practice_round`, `simulated_tournament`, `nine_hole`
- `event_status` — `not_registered`, `registered`, `played`, `skipped`
- `event_priority` — `priority`, `optional`, `stretch`, `backup`, `low`
- `session_type` — `range_full_swing`, `range_wedges`, `short_game`, `putting`, `on_course`, `gym`, `lesson`
- `homework_status` — `yes`, `partly`, `no`
- `link_relationship` — `parent`, `coach`
- `link_permission` — `read`, `write`

### Metrics ported from workbook formulas

| Metric | Definition | Edge case |
|---|---|---|
| Scoring average | Mean score over 18-hole `tournament` rounds | Returns `null` with zero qualifying rounds |
| Last-3 average | Mean of 3 most recent qualifying rounds | Returns `null` with fewer than 3 |
| Strokes to goal | Scoring average − goal target | Negative means goal met |
| Longest gap | Max days between consecutive planned events | Warn above 60 |
| Season fee total | Sum of entry fees for planned events | Excludes `skipped` |
| Minutes by type | Sum of practice minutes grouped by `session_type` | Compared to a healthy ratio for the athlete's level |

---

## Getting started

```bash
git clone <repo> fairway && cd fairway
pnpm install
cp .env.example .env.local          # fill in Supabase URL + anon key

supabase start                       # local Postgres + Auth on Docker
supabase db reset                    # apply migrations + seed
pnpm gen:types                       # regenerate types/database.ts

pnpm dev                             # http://localhost:3000
```

**Requirements:** Node 20+, pnpm, Docker (for local Supabase), Supabase CLI.

Seed data includes the reference athlete plan — five phases, a fall tournament schedule, the tour
catalog, three workout blocks, and a handful of logged rounds — so every screen has something real in
it from the first run.

### Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright |
| `pnpm test:rls` | pgTAP policy tests — **run before any PR touching migrations** |
| `pnpm test:contrast` | Assert every color pair in `DESIGN.md` §2 meets its WCAG ratio, both modes |
| `pnpm test:palette` | Run the eight chart slots through the colorblind validator, both modes |
| `pnpm gen:types` | Regenerate DB types |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint + Prettier |

`test:contrast` and `test:palette` read the live token values from `app/globals.css` and run in
CI (`.github/workflows/ci.yml`) — editing a token to a failing value fails the build. The design
system is rendered end-to-end at [`/styleguide`](app/(app)/styleguide/page.tsx) in both light and
dark; it is the fastest way to catch a regression.

---

## Repository layout

```
app/
  (auth)/          sign-in, sign-up, guardian-consent
  (app)/
    dashboard/     the "am I getting there" screen
    rounds/        list, new, [id]
    schedule/      events, tour catalog
    practice/      sessions + minutes-by-type
    lessons/       lesson log, coach-authored
    training/      weekly plan by phase
    strength/      blocks, exercises, logging
    settings/      profile, links, invitations
components/
  ui/              shadcn primitives on the Clubhouse tokens
  charts/          Recharts wrappers reading --chart-1..8
lib/
  supabase/        server + browser clients
  schemas/         Zod, one file per entity
  stats/           pure metric functions — the workbook formulas
  ai/
    provider.ts    swappable model vendor
    context.ts     buildAthleteContext() — the only prompt input path
    prompts/       versioned prompt fragments, reviewed like code
    pipeline.ts    compose → generate → moderate → ground → log
    fallbacks/     deterministic text for every AI surface
supabase/
  migrations/      checked in, never edited after merge
  seed.sql
  tests/           pgTAP RLS tests
types/database.ts  generated — do not hand-edit
```

---

## Roadmap

**MVP — one athlete, all eight domains.** Auth with guardian consent, the full schema with RLS,
round logging, the dashboard, schedule, practice, lessons, training plan, strength program. A single
athlete can replace the spreadsheet entirely.

**V1 — the people around the athlete.** Parent and coach invitations, permission-scoped access,
coach-authored lessons, charts and trend analysis, the shared tour catalog with filtering, PWA and
offline round capture, notifications for gap warnings and upcoming events.

**V1.5 — the AI coach and caddy.** Ambient coaching messages written into the surfaces the athlete
already visits: a post-round debrief, a note on each tournament plan entry, a weekly training focus, a
workout block introduction, a line of orientation on the dashboard. Coaches shape the voice through
bounded presets and sliders — warmth, directness, technicality, humor — that map to curated prompt
fragments, so the style is theirs without a coach ever writing prompt text aimed at a minor. Messages
are labeled as AI and attributed to a style rather than a person. A conversational caddy follows in V2,
once the moderation and evaluation infrastructure is proven.

**V2 — teams, programs, and the next level.** Team rosters and coach dashboards across many athletes,
qualifying-round management, benchmarking against level-appropriate norms, college recruiting profiles
with exportable player résumés, strokes-gained analysis, and a public API.

Detail, sequencing, and dependencies for all 42 sessions are in [`BACKLOG.md`](./BACKLOG.md).
Conventions, guardrails, and the Definition of Done are in [`CLAUDE.md`](./CLAUDE.md). The AI coach
layer is specified in [`AI_COACH.md`](./AI_COACH.md) and the visual system in
[`DESIGN.md`](./DESIGN.md).

---

## Design principles

1. **The dashboard answers one question.** Am I getting there. Everything else is navigation.
2. **Logging takes under 60 seconds on a phone in a parking lot.** A round gets logged right after
   it's played or it never gets logged at all.
3. **Progressive disclosure.** A ten-year-old logs score and penalties. A college player logs strokes
   gained. Same form.
4. **Never show an empty chart.** Empty states explain how to fill them.
5. **Encouraging, never nagging.** No streak-shaming. The motivation is a visible gap to a real goal.
6. **Legibility beats elegance** every time the two conflict. The defining moment is a phone in
   sunlight in a parking lot.
7. **The AI has a voice, not an opinion.** It phrases what the data and the plan already say. A coach
   can dial directness up; nobody can dial kindness to zero.

---

## What this deliberately is not

- **Not a scraper.** No auto-import from tour sites or GHIN. Junior tour results pages are unstable,
  usually unauthenticated, and scraping them is both a maintenance treadmill and a terms problem.
- **Not a social network.** No public profiles, no athlete-to-athlete messaging. The abuse surface
  around minors is not worth it without moderation capacity.
- **Not gamified.** Badges push toward logging-as-performance instead of honest data.
- **Not a swing analyzer.** Video coaching is a different product with different economics.
- **Not an AI that gives advice.** The model never prescribes, never predicts an outcome, and never
  discusses nutrition, weight, injury, or mental health. It narrates a plan a human system produced.

---

## Compliance

Fairway collects data from minors and is built accordingly. COPPA governs users under 13: verifiable
guardian consent is required before any personal information is stored, so an under-13 signup creates
a pending account that cannot hold data until a guardian completes the link flow. FERPA may apply if a
school program adopts the app, so education-record-adjacent data stays separable. Data collection is
minimum-necessary throughout.

This is engineering guidance, not legal advice — have counsel review before public launch.
