# Fairway — Claude Code Session Backlog

Each numbered session is scoped to roughly one focused Claude Code session. Work them in order unless
the dependency graph says otherwise. Read [`CLAUDE.md`](./CLAUDE.md) first, every session.

**Before starting a session:** confirm its dependencies are complete.
**Before finishing:** meet the Definition of Done in `CLAUDE.md`.
**If you find adjacent work:** add it to this file rather than doing it. Scope creep across sessions
is what makes a plan like this fall apart.

---

## Dependency map

```
MVP
  1 ─ 2 ─ 3 ─ 4 ─┬─ 5 ─ 6 ─┬─ 7 ─ 8 ─ 9
                 │         ├─ 10
                 │         ├─ 11
                 │         ├─ 12
                 │         └─ 13
                 └─ 14 ─ 15

V1
  15 ─┬─ 16 ─ 17 ─ 18
      ├─ 19 ─ 20
      ├─ 21 ─ 22
      ├─ 23
      └─ 24 ─ 25

V1.5 — AI coach
  25 ─ 26 ─┬─ 27 ─ 28 ─┬─ 29
           │           ├─ 30
           │           ├─ 31
           │           └─ 32
           └───────────── 33

V2
  25 ─┬─ 34 ─ 35 ─ 36
      ├─ 37 ─ 38
      ├─ 39
      ├─ 40
      └─ 41 ─ 42
```

---

# MVP — one athlete replaces the spreadsheet

**Definition of success:** a single athlete can abandon the Excel workbook and lose nothing.

---

## Session 1 — Project scaffold

**Depends on:** nothing
**Goal:** a running Next.js app with tooling locked down, deployed to a preview URL.

Initialize Next.js with the App Router and TypeScript in strict mode. Add Tailwind and initialize
shadcn/ui. Configure ESLint and Prettier with pre-commit hooks. Set up Vitest with a trivial passing
test and Playwright with a smoke test that loads `/`. Create the `(auth)` and `(app)` route groups
with placeholder layouts. Write `.env.example`. Connect the repo to Vercel with preview deploys per PR.

**Pin every dependency version and do not bump majors for the remainder of this backlog.**

**Files:** `package.json`, `tsconfig.json`, `tailwind.config.ts`, `.eslintrc`, `app/layout.tsx`,
`app/(auth)/layout.tsx`, `app/(app)/layout.tsx`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`

**Done when:** `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm test:e2e`, and `pnpm lint` all pass clean,
and a PR produces a working preview deploy.

---

## Session 2 — Design foundations

**Depends on:** 1
**Goal:** the Clubhouse design system, installed and enforced, before any screen exists.

Full specification in [`DESIGN.md`](./DESIGN.md). Token values in [`globals.css`](./globals.css).

Install `globals.css` as-is — **every value in it has been contrast-checked and every chart slot
colorblind-validated. Do not adjust a token without re-running the checks in `DESIGN.md` §9.** Wire
the tokens into `tailwind.config.ts` so `bg-primary`, `text-muted-foreground`, `border-input`, and the
chart slots resolve. Initialize shadcn/ui against these variables.

Load the three families — Playfair Display (display), Inter (UI), JetBrains Mono (data) — via
`next/font`. Variable fonts where available, Playfair subset to Latin and the weights actually used,
`font-display: swap`, preload Inter only. Three families is a real payload and the app's defining
moment is a phone on course wifi.

Build the primitives the rest of the backlog assumes: `.metric-card`, `.metric-card-primary`,
`.scorecard-table`, `.ai-note`, `.empty-state`, the button variants, and a `<DataValue>` component
that applies tabular figures. Then the Recharts wrappers reading `--chart-1` through `--chart-8` in
fixed order, with grid and axis on the recessive tokens.

Add two CI checks, because a design system that isn't enforced is a suggestion:

- `pnpm test:contrast` — asserts every pair in `DESIGN.md` §2 meets its ratio in both modes
- `pnpm test:palette` — runs the chart slots through the colorblind validator, both modes

Ship a `/styleguide` route rendering every token, component, and chart form in both modes. It is the
fastest way to catch a regression and the reference for every later session.

**Files:** `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`, `components/ui/*`,
`components/charts/*`, `app/(app)/styleguide/page.tsx`, `scripts/check-contrast.ts`

**Done when:** `/styleguide` renders correctly in light and dark, both CI checks pass, and a
deliberately broken token value fails the build.

---

## Session 3 — Supabase, local dev, and the enum foundation

**Depends on:** 1
**Goal:** local Supabase running, first migration applied, types generating.

Install and configure the Supabase CLI for local development on Docker. Create `lib/supabase/server.ts`
and `lib/supabase/client.ts` using `@supabase/ssr`, plus middleware for session refresh. Write the
first migration containing **only the enum types** and the `updated_at` trigger function:

`round_type`, `event_status`, `event_priority`, `session_type`, `homework_status`,
`link_relationship`, `link_permission`, `athlete_level`, `workout_part`, `link_status`

Add `pnpm gen:types` and commit the generated `types/database.ts`.

**Why enums alone in one migration:** they are referenced by nearly every later table, and getting
their values wrong is expensive to fix. Take the values verbatim from the workbook's data validation
lists — they are recorded in `README.md`.

**Files:** `supabase/config.toml`, `supabase/migrations/0001_enums.sql`, `lib/supabase/*`,
`middleware.ts`, `types/database.ts`

**Done when:** `supabase db reset` runs clean and `pnpm gen:types` produces enum types matching the spec.

---

## Session 4 — Identity schema and RLS foundation

**Depends on:** 3
**Goal:** the profile/athlete/link triangle, with the RLS helper that every later policy uses.

Create `profiles` (1:1 with `auth.users`, populated by trigger on signup), `athletes`, and
`athlete_links`. Include `team_id uuid null` on `athlete_links` now, even though teams do not exist
until V2 — adding it later means migrating live permission data, which you do not want to do.

Write the security-definer helper functions that all subsequent policies call:

```sql
can_read_athlete(athlete_id uuid) returns boolean
can_write_athlete(athlete_id uuid) returns boolean
```

Each returns true if the current user owns the athlete, or has an **accepted** link with sufficient
permission. Getting these two functions right is the highest-leverage work in the entire backlog —
every table's policy is a one-liner delegating to them.

Enable RLS on all three tables with their own policies. Write pgTAP tests covering: owner reads own,
accepted-link user reads, pending-link user is denied, unlinked user is denied, read-permission user
cannot write.

**Files:** `supabase/migrations/0002_identity.sql`, `supabase/migrations/0003_rls_helpers.sql`,
`supabase/tests/rls_identity.sql`

**Done when:** `pnpm test:rls` passes all five scenarios. **Do not proceed to Session 5 until it does.**

---

## Session 5 — Auth flows with guardian consent

**Depends on:** 4
**Goal:** users can sign up and sign in, and under-13 accounts are gated behind guardian consent.

Build sign-up, sign-in, magic link, sign-out, and password reset. Sign-up collects date of birth.

The consent gate: if the athlete is under 13, the account is created in a `pending_consent` state
that **cannot write any athlete data**. They enter a guardian email; the guardian receives a link,
verifies, and the account activates. Enforce the gate in RLS — not just in the UI — by having
`can_write_athlete` return false for athletes in `pending_consent`.

Add route protection in middleware and a `pending_consent` holding screen.

**This is a compliance requirement, not a feature.** See the Compliance section of `CLAUDE.md`.

**Files:** `app/(auth)/**`, `app/(app)/pending-consent/page.tsx`, `middleware.ts`,
`supabase/migrations/0004_consent.sql`, `lib/schemas/auth.ts`

**Done when:** an under-13 signup cannot create a round until a guardian consents, proven by a pgTAP
test and a Playwright e2e run.

---

## Session 6 — Core domain schema

**Depends on:** 5
**Goal:** every remaining table, with policies, in one coherent migration set.

Create `goals`, `leaks`, `phases`, `tours`, `events`, `rounds`, `practice_sessions`, `lessons`,
`workout_blocks`, `workout_exercises`, `workout_logs`, `week_templates`. Schema is specified in
`README.md`.

Every athlete-owned table gets RLS delegating to `can_read_athlete` / `can_write_athlete`. `tours` is
the exception — it is a shared catalog, readable by all authenticated users, writable only by
service role in MVP.

Add the indexes that matter: `(athlete_id, played_on desc)` on rounds, `(athlete_id, plays_on)` on
events, `(athlete_id, occurred_on desc)` on practice_sessions.

Write `supabase/seed.sql` reproducing the reference plan: five phases, the fall tournament schedule,
the tour catalog, three workout blocks with exercises, the four leaks, and roughly ten logged rounds
with a visible downward trend. **Seed quality determines how useful every subsequent session is** —
if the dashboard has nothing to render, you cannot tell whether you built it correctly.

**Files:** `supabase/migrations/0005_*.sql` through `0009_*.sql`, `supabase/seed.sql`,
`supabase/tests/rls_domain.sql`

**Done when:** a fresh `supabase db reset` gives a fully populated reference athlete, and pgTAP proves
every athlete-owned table denies an unlinked user.

---

## Session 7 — Stats engine

**Depends on:** 6
**Goal:** every workbook formula, ported to a tested pure function.

Implement in `lib/stats/`:

- `scoringAverage(rounds)` — 18-hole `tournament` rounds only; `null` if none
- `lastNAverage(rounds, n)` — `null` if fewer than n qualify
- `bestRound(rounds)`, `strokesToGoal(avg, target)`
- `averagePerRound(rounds, field)` for penalties, three-putts, putts
- `gapDays(events)` and `longestGap(events)` — days between consecutive planned events
- `seasonFeeTotal(events)` — excludes `skipped`
- `minutesByType(sessions)` and `practiceRatio(sessions)`
- `trendline(rounds)` — least-squares fit for the dashboard trend

**Build this before any UI that displays a number.** Every one of these has an edge case the
spreadsheet handled and a naive implementation gets wrong — division by zero, insufficient sample,
mixed hole counts, null pars. Table-driven unit tests, including the empty case for every function.

**Files:** `lib/stats/*.ts`, `lib/stats/__tests__/*.test.ts`

**Done when:** every function has tests covering the happy path, the empty case, and the boundary
case, and results match the workbook's numbers for the seeded rounds.

---

## Session 8 — Round logging

**Depends on:** 7
**Goal:** the Score Log tab — the 60-second parking-lot form.

Round list (newest first, filterable by type), new-round form, detail view, edit, delete with
confirmation. Server Actions with shared Zod validation.

The form is the most important screen in the app. Requirements:

- Date, course, type, holes, par, score are the **only** required fields
- Everything else — penalties, three-putts, putts, fairways, GIR, up-and-downs, doubles — sits behind
  a "Add detail" expander, remembered per user
- Large tap targets, numeric keyboards, no free-text where a stepper works
- Course name autocompletes from the athlete's history
- Optimistic UI; the form must feel instant on a bad course-parking-lot connection

Prototype at 375px width first, then scale up.

**Files:** `app/(app)/rounds/**`, `lib/schemas/round.ts`, `components/rounds/*`

**Done when:** a full 18-hole tournament round with detail stats can be logged in under 60 seconds on
a 375px viewport, verified by a timed Playwright run.

---

## Session 9 — Dashboard

**Depends on:** 8
**Goal:** the "am I getting there" screen.

Above the fold: current scoring average, goal target, strokes to goal, and the trend direction.
Below: score trend chart over time with the goal as a reference line, the leak breakdown showing
current per-round averages against targets, current phase with its score target and days remaining,
next event with a countdown, and a gap warning if the longest gap exceeds 60 days.

Make it the post-login landing page.

Every widget needs a real empty state that says what to do — "Log three tournament rounds to see your
average" beats a zero.

**Files:** `app/(app)/dashboard/page.tsx`, `components/charts/*`, `components/dashboard/*`

**Done when:** the dashboard matches the seeded athlete's workbook numbers exactly, and renders
sensibly for a brand-new athlete with zero rounds.

---

## Session 10 — Schedule

**Depends on:** 6
**Goal:** the Tournament Plan tab.

Event list grouped by month with status and priority badges. Create/edit/delete. Gap days computed
between consecutive events with a visible warning above 60. Season summary: events planned, played,
total entry fees, longest gap. Status transitions `not_registered → registered → played`, and marking
an event played offers to create the linked round.

**Files:** `app/(app)/schedule/**`, `lib/schemas/event.ts`, `components/schedule/*`

---

## Session 11 — Practice log

**Depends on:** 6
**Goal:** the Practice Log tab, including the ratio check.

Session list, quick-add form (type, minutes, focus, drill, result), and the minutes-by-type rollup
over a selectable window. Show the athlete's actual practice mix against a healthy ratio for their
level — the workbook's insight is that a 113 shooter practicing mostly full swing has their ratio
backwards, and the app should say so plainly without scolding.

**Files:** `app/(app)/practice/**`, `lib/schemas/practice.ts`, `components/practice/*`

---

## Session 12 — Lessons

**Depends on:** 6
**Goal:** the Lesson Log tab, athlete-authored for now.

List and form: date, coach name, swing key, drill assigned, homework target, homework done
(`yes`/`partly`/`no`), cost, what changed. Show outstanding homework on the dashboard. Coach-authored
lessons arrive in Session 18.

**Files:** `app/(app)/lessons/**`, `lib/schemas/lesson.ts`

---

## Session 13 — Training plan and strength program

**Depends on:** 6
**Goal:** the Weekly Schedule and Workout Plan tabs.

Phase-aware weekly view rendering the template for the current phase, with the week's total hours and
activity mix. Phase switcher to preview other phases. Strength blocks with their exercise lists
(part, sets, reps, coaching note), the current block surfaced by date, and simple set/rep logging that
writes an `exercise` practice segment so the minutes rollup stays honest.

**Files:** `app/(app)/training/**`, `app/(app)/strength/**`, `components/training/*`

---

## Session 14 — Goals and phases management

**Depends on:** 6
**Goal:** the Start Here tab, made editable.

Goal editor (metric, target, deadline, baseline, why). Leak editor with current range, target, and
strokes-saved, with the total computed. Phase editor with dates, main job, and score target. Validate
that phases do not overlap and that leak strokes-saved sums to the stated gap.

The "why" field matters — the workbook's version was a paragraph about making the roster, and it is
the thing that gets read on a bad day. Give it room.

**Files:** `app/(app)/settings/goals/**`, `lib/schemas/goal.ts`

---

## Session 15 — MVP hardening

**Depends on:** 7, 8, 9, 10, 11, 12, 13, 14
**Goal:** ship-ready.

Full pgTAP sweep across every table. Playwright journey: sign up → consent → set goal → log rounds →
see dashboard update. Accessibility pass (axe clean, keyboard navigable, labelled inputs). Responsive
audit at 375/768/1280. Error boundaries and loading skeletons on every route. Empty states everywhere.
Seed-data reset script for demos. Update `README.md`.

**Done when:** a new user can go from signup to a populated dashboard with no dead ends, no console
errors, and no unlabelled inputs.

---

# V1 — the people around the athlete

---

## Session 16 — Invitations and linking

**Depends on:** 15
**Goal:** parents and coaches get access.

Email invitation flow creating a `pending` `athlete_links` row with a permission level. Acceptance
flow for both existing and new users. Management screen for the athlete: view links, change
permission, revoke. Revocation must take effect immediately at the RLS layer.

Guard the abuse cases: an athlete cannot invite themselves, links cannot be created without athlete
consent, and invitation tokens are single-use and expiring.

---

## Session 17 — Multi-athlete switching

**Depends on:** 16
**Goal:** a parent with three kids, or a coach with twelve students.

Athlete switcher in the app shell. Server-side resolution of the active athlete with a permission
check on every request — **never trust a client-supplied athlete id**. Landing page listing all
accessible athletes with their headline number.

---

## Session 18 — Coach experience

**Depends on:** 17
**Goal:** the coach writes the lesson.

Coaches with write permission author lesson entries directly, assign drills with a target rep count,
and see whether homework was completed. Coach-facing view of an athlete's recent rounds and practice
mix. Notification to the athlete when a lesson or drill is assigned.

---

## Session 19 — Analytics and charts

**Depends on:** 15
**Goal:** the trends the spreadsheet could not show.

Scoring trend with a rolling average and goal line. Leak trends over time — penalties per round,
three-putts per round — which is the chart that proves the strategy is working. Practice mix over
time. Score distribution. Performance by course and by tour. Date-range filtering throughout.

Follow the `dataviz` conventions: one visual system, accessible in light and dark, never a chart
where a number would do.

---

## Session 20 — Reports and export

**Depends on:** 19
**Goal:** get data out.

CSV export per entity. Season summary PDF suitable for handing to a high school coach. Round-by-round
scorecard export. Full data export for portability.

---

## Session 21 — Tour catalog

**Depends on:** 15
**Goal:** the Tour Options tab, shared and searchable.

Browsable catalog filtered by region, age, season, format, and cost. Athlete-submitted tours with a
moderation queue. "Add to my schedule" creating an event pre-filled from the tour. Distance from the
athlete's home area.

**Manual and community-maintained. Do not scrape tour sites** — see `CLAUDE.md`.

---

## Session 22 — Notifications

**Depends on:** 21
**Goal:** the app speaks up at the right moments.

Email and in-app: gap warning approaching 60 days, upcoming event reminders, registration deadlines,
outstanding lesson homework, phase transitions. Per-type preferences, all defaulting to a
conservative cadence.

Nothing here may shame. No streaks, no "you missed a session." See the tone guidance in `CLAUDE.md`.

---

## Session 23 — PWA and offline capture

**Depends on:** 15
**Goal:** logging works with no signal.

Installable PWA. Offline round entry queued in IndexedDB and synced on reconnect, with clear pending
state and conflict handling. Golf courses have famously bad cell coverage; this closes the loop on
the 60-second logging promise.

---

## Session 24 — Onboarding

**Depends on:** 15
**Goal:** a new athlete gets to value fast.

Guided setup: profile and level, goal with a suggested target based on current average, phase plan
generated from the season dates, starter weekly template by level, and first-round entry. Import path
for an existing spreadsheet. Sample data preview so the dashboard is never empty on day one.

---

## Session 25 — V1 hardening

**Depends on:** 16–23
**Goal:** ship-ready with multiple users.

Permission matrix e2e tests for every role/permission combination. Load test with a coach linked to
fifty athletes. Query performance review — this is where the pure stats functions may need
materialized views. Security review of invitation tokens and consent flows. Accessibility re-audit.

---

# V1.5 — AI coach and caddy

Full design in [`AI_COACH.md`](./AI_COACH.md). Read it before Session 26.

**The governing rule:** the deterministic engine decides substance, the LLM decides voice. No session
in this phase may put a model in the position of originating a prescription, a number, or a fact.

**Definition of success:** every athlete gets coaching-quality messaging in their coach's style, and
the app remains fully usable with the entire AI layer switched off.

---

## Session 26 — AI infrastructure and safety pipeline

**Depends on:** 25
**Goal:** the plumbing and every guardrail, before a single athlete-facing surface exists.

Provider abstraction in `lib/ai/provider.ts` so the model vendor is swappable. Versioned prompt
registry in `lib/ai/prompts/` — prompts are code, reviewed in PRs, never edited in a dashboard. The
six-stage pipeline from `AI_COACH.md`: context → compose → generate → moderate → ground → log.

Build these three first, because everything else depends on them being real:

- **Output moderation** — classifier over banned categories (nutrition/weight, medical, mental health
  intervention, outcome prediction, athlete comparison), plus the tone floor and a PII-leak check.
- **Grounding check** — extract every numeral from the generated text and assert each appears in the
  context object. Mechanical, not judgmental. This is the anti-hallucination control.
- **Kill switches** — one global, one per surface, both runtime not deploy-time.

`ai_generations` table logging context hash, prompt version, output, every verdict, latency, and cost.
RLS: athlete-owned, readable by the athlete and linked users.

**Done when:** a test harness can run a fixture context end to end, a deliberately ungrounded output
is rejected, a banned-category output is rejected, and flipping the kill switch stops generation
globally. **No athlete-facing surface ships before all four are demonstrated.**

---

## Session 27 — Athlete context builder

**Depends on:** 26
**Goal:** exactly one function may construct what the model sees.

Implement `buildAthleteContext(athleteId, surface)` returning the typed object specified in
`AI_COACH.md`. It composes from the stats engine and the plan state — it never queries raw tables into
the prompt and never recomputes a metric the stats engine already owns.

Enforce minimization: no name, no school, no city, no date of birth, no email, no free text authored
by another user. `ageBand` is derived, never raw DOB. Gender is carried for eligibility and
programming only and is explicitly excluded from tone.

Add a lint rule or test that fails if any prompt is constructed outside this function. The
architectural guarantee is only worth what the enforcement is worth.

**Done when:** a unit test asserts the context contains no PII for a fully-populated athlete, and a
gender-flip pair produces identical context on every non-eligibility field.

---

## Session 28 — Voice and tone system

**Depends on:** 27
**Goal:** a coach's style, expressed in bounded parameters.

`VoiceProfile` schema and storage on the coach's profile, with a per-athlete override. Four presets —
`encouraging`, `direct`, `analytical`, `old_school` — plus warmth, directness, technicality, and humor
on 1–5 scales, and up to three signature phrases from a vetted list.

Each parameter value maps to a curated prompt fragment authored and reviewed by the team. **The coach
composes from a palette; the coach never writes prompt text.**

Enforce the two hard constraints: warmth has a floor of 2 regardless of setting, and technicality is
capped by the athlete's age band, so a coach who sets 5 gets 5 for college players and 3 for
twelve-year-olds automatically.

Coach settings UI with **live preview across all five surfaces against a fixture athlete**. No coach
should ever be surprised by what their athletes see.

Coach opt-in for voice attribution, revocable, effective on next generation.

**Done when:** all four presets render distinguishable output on the same context, the warmth floor
and technicality cap hold under adversarial settings, and preview matches production output exactly.

---

## Session 29 — Post-round debrief

**Depends on:** 28
**Goal:** the first athlete-facing surface, and the highest-value one.

Generated on round save, asynchronously, cached permanently on the round record. Three to four
sentences: what the numbers say, one thing that went right, one leak to attack next.

**Build the deterministic fallback first** — a plain templated debrief that is genuinely useful on its
own — then wrap the model around it. If generation fails, times out, or fails moderation, the athlete
sees the fallback and never sees an error.

AI label, feedback control (helpful / not helpful / report), and regeneration for the athlete.

The emotional stakes are highest here: this message lands right after a round, sometimes a bad one.
Test it against the fixtures that hurt — a 30-stroke outlier, a declining trend, a first round back
after a long gap.

**Done when:** every fixture context produces a debrief passing all pipeline stages, and killing the
provider mid-save still results in a useful debrief on screen.

---

## Session 30 — Tournament plan notes and weekly training focus

**Depends on:** 28
**Goal:** two ambient surfaces on the planning side.

Event note generated on creation and refreshed as the event approaches: what this event is for in the
arc of the season, what a good day looks like here. Weekly focus generated at the start of the week,
tied to the current phase and the athlete's worst leak.

Both cached, both with deterministic fallbacks, both regenerating only on material context change.

Hard constraint enforced in the prompt and the moderation stage: **no outcome prediction.** The note
frames intent and process, never forecasts a score or a placing.

---

## Session 31 — Workout narration over the plan engine

**Depends on:** 28
**Goal:** block intros and exercise coaching notes — the surface where the substance/voice split matters most.

The plan engine selects the block and its exercises from the **vetted, human-authored exercise
library**. The model writes the block introduction and may select among pre-approved coaching cues for
this athlete's age band. It does not choose exercises, sets, reps, or loads, and it does not invent a
cue.

Moderation is strictest here: any output containing a load, a weight, a rep count, or a progression
not present in the library input is rejected outright. Any nutrition or body-composition content is
rejected. Pain or discomfort language routes to "stop and talk to an adult and a medical professional."

**Done when:** an adversarial fixture attempting to elicit a squat load produces either a rejection or
a load drawn verbatim from the library, and never anything else.

---

## Session 32 — Dashboard line and athlete controls

**Depends on:** 28
**Goal:** the last surface, plus everyone's off switch.

One line of orientation on the dashboard, cached daily. Then the controls that make the whole layer
legitimate:

- Athlete and parent can disable the AI layer entirely, per surface or globally
- With it off, every surface renders its deterministic content and nothing is lost
- Generation history is viewable by the athlete and linked users
- Feedback and report flow reaching a review queue

**Done when:** an e2e run with AI disabled globally exercises every surface with zero degradation in
usability and zero references to a missing feature.

---

## Session 33 — Evaluation suite and red team

**Depends on:** 26
**Goal:** the thing that makes this feature maintainable instead of a permanent liability.

Fixture set of 40+ contexts spanning all four age bands, all four presets, both genders and
unspecified, and the breaking cases — zero rounds, a 30-stroke outlier, a declining trend, a met goal,
a 90-day gap, insufficient data everywhere.

Per-generation assertions: banned-category clean, every numeral grounded, reading level within band,
length within bounds, tone floor satisfied, no PII, and gender-flip tone equivalence.

**Adversarial set** built from athlete-authored free text — round notes, practice results, homework
notes — engineered to inject instructions, extract the system prompt, or elicit a banned category.
This is the realistic attack surface in V1.5: there is no chat box, but there is a notes field, and
that field reaches a prompt.

Wire the suite into CI on every prompt change. Add cost and volume alerting per athlete, per coach,
and globally.

**Done when:** the suite runs in CI, every adversarial fixture fails to influence output, and a
deliberately regressed prompt is caught by the suite rather than by a user.

**This session may be worked in parallel with 26–31 and must be complete before any of them reaches
production.**

---

# V2 — teams, programs, and the next level

Lighter specification by design; scope these properly when V1 is in real use. These sessions are
independent of the V1.5 AI phase and may be worked in parallel with it.

---

## Session 34 — Teams and rosters

**Depends on:** 25

`teams` and `team_memberships` tables. Coaches create teams and invite athletes; athletes accept.
Team-scoped RLS extending the existing `athlete_links.team_id`. Season and roster management.

---

## Session 35 — Coach dashboard

**Depends on:** 34

Roster overview with each athlete's headline number, sortable by scoring average, trend, and practice
volume. Flags for athletes trending the wrong way or under-practicing. Bulk event assignment.
Team-wide practice compliance.

---

## Session 36 — Qualifying and lineups

**Depends on:** 35

Qualifying-round management, running scoring across a qualifying series, lineup selection with a
recorded rationale, and published results visible to the roster.

---

## Session 37 — Benchmarking

**Depends on:** 25

Anonymized, aggregated norms by age and level so an athlete can see where they stand. Percentile bands
on the dashboard. Requires a real privacy design — minimum cohort sizes, opt-in, no re-identification.
Do not start until there is enough data for cohorts to be meaningful.

---

## Session 38 — Strokes gained

**Depends on:** 37

Shot-level entry (optional, college-focused), strokes-gained by category against a level-appropriate
baseline, and the leak model upgraded from counts to strokes gained. This is the feature that keeps
a college player engaged.

---

## Session 39 — Recruiting profile

**Depends on:** 25

Exportable player résumé: scoring average, tournament record, best rounds, academic info, and coach
references. Shareable link with expiry and access logging. Tournament results timeline.

---

## Session 40 — Public API

**Depends on:** 25

Authenticated REST API with scoped tokens, rate limiting, webhooks for round and event creation, and
documentation. Enables launch monitors and third-party integrations without Fairway scraping anything.

---

## Session 41 — Coach marketplace groundwork

**Depends on:** 25

Coach profiles, lesson scheduling and availability, payment rails for lesson fees. Large scope with
real regulatory and trust-and-safety weight around minors. Treat this session as a spike producing a
proposal, not an implementation.

---

## Session 42 — Native shell

**Depends on:** 23, 41

Only if the PWA proves inadequate — evaluate with real usage data before starting. Push
notifications, home-screen presence, and camera capture for swing video are the plausible drivers.

---

# Proposed — coach-assigned practice

**Raised by the owner during Session 11. Needs a session number when V1 is next re-planned;
it belongs immediately after Session 18 and depends on it.**

**Goal:** a coach prescribes practice with minutes-based targets, and the athlete can see what was
asked and how close they got.

Session 18 already has the coach assigning drills with a target rep count. This is the other half:
targets in MINUTES, by discipline, which is the unit the Practice Log and the ratio check already
speak. A coach assigns "this week: 90 min short game, 60 min putting, 45 min full swing" and the
athlete sees it against what they actually logged.

`practice_assignments` (athlete_id, assigned_by, a date or week window, an optional note,
`status assignment_status`) with a child `practice_assignment_targets` (session_type,
target_minutes) — the same parent/child shape, and the same rule, as `practice_segments`: minutes per
discipline, never one total to be divided.

Note the write asymmetry, which the RLS policies have to encode: the COACH owns the targets (the
athlete must not be able to lower a target to meet it), the ATHLETE owns the status (a coach must not
be able to mark someone's work complete or missed on their behalf). `can_write_athlete` is not
sufficient on its own for either — this is the first table in the schema where "who may write" splits
by column, so expect the policies to be longer than the one-liners everywhere else, and test both
directions in pgTAP.

**Settled by the owner:**

**The athlete declares the outcome; the log supplies the minutes. These are different fields, and
neither is a competing claim about the same number.** The athlete records one of
`complete | partial | exceeded | missed` (a new `assignment_status` enum) against each assignment —
a judgment the log cannot make on its own, since only the athlete knows whether 40 logged minutes was
the session cut short or the session done properly. The minutes shown beside it come from their
logged segments as normal. A coach reading it sees both: what was asked, what was declared, what was
logged.

**`missed` is a first-class, athlete-recorded outcome, and the design depends on it being one.**
This is what keeps the feature on the right side of the CLAUDE.md tone rule. The risk with a
compliance tracker is that it pressures an athlete into logging what the coach asked for instead of
what happened, which would quietly rot every number on the Practice screen including the ratio check.
That pressure comes from a miss being a silent failure state the athlete is caught in. Here it is
something they report, so reporting it honestly IS operating responsibly — which is the thing the
record is meant to measure. Build it that way: logging a miss must be as easy and as unpunished as
logging a completion, and it never earns a red badge or a broken streak.

**The record is a litmus test for all three parties, not surveillance of one.** Athlete, coach and
parent read the same view. Athlete-logged sessions above and beyond the assigned ones count and are
visible as such — an athlete without a coach uses the Practice Log exactly as it works today, and the
assignment layer only ever adds to it.

**Corollary that follows from the above, and is not optional:** the athlete sees precisely what their
coach and parent see, with no hidden diligence score and no derived "reliability" figure computed
behind their back. This is a product for minors; a record about someone that they cannot themselves
read is not something to build here.

**Still open:**

- **Whose opinion leads on screen?** The athlete would now have two: the coach's assignment and the
  healthy-mix band. They can legitimately disagree. A real coach who knows this athlete should
  outrank a generic band — so lead with the assignment and keep the band as context, not the reverse.

**Also:** an assignment note is free text authored by another user. It must never reach
`buildAthleteContext()` — AI_COACH.md already forbids that, and this is precisely the tempting case.

**Files:** `supabase/migrations/00NN_practice_assignments.sql`, `lib/schemas/assignment.ts`,
`lib/practice/assignments.ts`, `app/(app)/practice/**`, coach-side authoring under Session 18's surfaces

---

# Proposed — video and media on lessons and practice

**Raised by the owner during Session 12. Needs a session number when V1 is next re-planned; it
belongs after Session 15 and before Session 18. The athlete-uploaded half depends only on 12; letting
a coach or parent upload depends on 16.**

**Goal:** a coach, parent, or athlete attaches the swing-analysis clip their coach exported — from
Swing Coach, V1 Golf, Hudl Technique — to the lesson or practice session it belongs to, and everyone
with access can watch it.

This conflicts with CLAUDE.md as written ("Photos/video: not in MVP") and is therefore flagged rather
than assumed. It does not conflict with the rule attached to it: **private by default, no shareable
public URL**, which everything below is built to honour.

**Settled by the owner:**

**Fairway stores and plays clips. Fairway does not draw on them.** Coaches already own telestration
tools they know, and the export from those tools is an ordinary video file. Building frame-by-frame
markup and voice-over inside Fairway is months of work competing with software that is better at it,
and it is explicitly not in scope. If this comes back up, the answer is still no.

**Uploads are exports, not camera-roll footage, and that is what makes this affordable.** Analysis
apps exist to produce something a coach can send to a student, so they render H.264/AAC in MP4 — the
one combination every browser plays. Raw iPhone capture (HEVC in a `.mov`) is the case that would
force a transcoding vendor, and it is not the case here. **So: no Mux, no Cloudflare Stream, no
ffmpeg.** The clip never leaves Supabase, which makes every compliance answer below dramatically
easier — a deletion guarantee becomes a `delete` call rather than a contract negotiation.

**`.mov` and `.mp4` are containers, not codecs, so the fallback is the design, not the validation.**
Do not police formats at upload. A `<video>` element raises `MEDIA_ERR_SRC_NOT_SUPPORTED` when a
browser cannot decode a source; catch it and render "This clip's format isn't supported in your
browser — download it to watch" beside the signed URL. Nothing is rejected, nothing is lost, nobody
hits a dead end. **If that fallback fires often in real use, that is the evidence to fund a
transcoder — measure before spending.**

**One table, not two, and shaped now for the third parent it will need.**

```
athlete_media
  athlete_id           not null
  lesson_id            nullable
  practice_session_id  nullable
  check (num_nonnulls(lesson_id, practice_session_id) = 1)
```

Both FKs composite with `athlete_id`, the same guard `practice_segments` uses, so a clip can never
straddle two athletes. RLS is the usual one-liner pair over `can_read_athlete` / `can_write_athlete`,
which already means "the athlete plus anyone with an accepted link" — so "playback for every user
type" needs no new authorization work at all. Adding `round_id` later is a nullable column and a
widened check; the athlete will want it ("the swing that put me in the trees on 14"), and this is the
same seam left open by `athlete_links.team_id`.

**Media attaches to a practice SESSION, not a segment.** Asking which discipline a clip belongs to is
friction the 60-second rule does not allow, and a clip is about the day.

**`uploaded_by_user_id` is a product field, not just an audit column.** Three people can add a clip;
the UI says "added by Coach Diaz."

**Uploads go browser → storage directly.** Vercel caps a serverless request body at 4.5MB and a
clip is 20–150MB, so the file must never pass through the Next server. Signed upload URLs from a
Server Action; the action records the row on confirmation. Note `supabase/config.toml` currently sets
`file_size_limit = "50MiB"`, which is too tight — raise it, and cap duration in the UI.

**Storage objects are not reachable from a Postgres trigger.** Deleting a lesson cascades the rows and
strands the objects. The orphan sweep needs its own path (Edge Function or scheduled job) and it is
part of this ticket, not a follow-up — an un-deletable video of a minor is the worst possible bug
here.

**The dropzone is not a control.** A real `<input type="file">` behind it, or the whole thing fails
the keyboard and labelling lines in the Definition of Done.

**Still open — these are the owner's calls, and the migration should not be written until they are
answered:**

- **Does the existing consent gate cover video, or does video need its own explicit consent?** Video
  of a child's face and body is unambiguously personal information under COPPA. The current flow
  gates account usability from date of birth; it does not name media. Assume it needs its own
  surface until decided otherwise.
- **Do parents get upload rights at all?** CLAUDE.md says a parent "typically does not edit
  swing/practice content." A parent filming from behind the range is a real and sympathetic case, and
  it is also a second adult adding video of a minor. Decide deliberately rather than inheriting it
  from `can_write_athlete`.
- **Per-athlete storage quota, and what happens at the ceiling.** Unbounded video storage is an
  unbounded bill and an unbounded abuse surface.
- **Retention.** How long does a clip from a lesson two seasons ago live? "Forever" is a decision, not
  a default.

**Also:** strip EXIF/geolocation on ingest, and no filename from the uploader ever reaches a public
path. A clip is never an input to `buildAthleteContext()` — AI_COACH.md forbids free text authored by
another user, and a video is the same problem with a bigger surface.

**Rough size:** ~1.5–2 sessions for the athlete-uploaded foundation across lessons and practice.
Coach and parent upload then rides on Sessions 16/18 at close to no extra cost, because the
authorization already exists and only the invitation flow is missing.

**Files:** `supabase/migrations/00NN_athlete_media.sql` (table, RLS, storage policies),
`lib/schemas/media.ts`, `lib/media/*`, `components/media/*`, `app/(app)/lessons/**`,
`app/(app)/practice/**`, `supabase/tests/rls_media.sql`

---

# Discovered work

Found mid-session and deliberately not fixed in flight (see hygiene rules below).

- **The round form's "Add detail" disclosure never collapses.** `components/rounds/round-form.tsx`
  puts `hidden={!detailExpanded}` and `className="flex …"` on the same element. Tailwind's preflight
  `[hidden]{display:none}` and the `.flex` utility have equal specificity and utilities are emitted
  last, so `flex` wins and the panel is always open — the eight leak fields are on screen for a
  ten-year-old logging a score, which is exactly what the disclosure exists to prevent. Found in
  Session 11, which hit the same trap; the fix there was to move the layout to an inner wrapper so
  the element carrying `hidden` has no display utility of its own. Apply the same fix, and add the
  `toBeHidden()` assertion to `e2e/rounds.spec.ts` that `e2e/practice.spec.ts` now carries.
  Small — fold into Session 15 (MVP hardening) or take it standalone.

---

# Backlog hygiene

- Add discovered work here rather than expanding a session in flight.
- Re-order freely within a phase; do not pull V2 work into V1 without cutting something.
- Sessions 4, 7, and 8 are load-bearing — RLS helpers, the stats engine, and the round form. If any
  of them is rushed, the sessions that depend on it inherit the problem. Take the extra time there.
