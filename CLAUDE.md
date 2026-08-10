# CLAUDE.md

Project context for Claude Code. Read this at the start of every session.

---

## What this project is

**Fairway** is a multi-user web application for junior, high school, and college golfers to plan,
track, and improve their competitive game. It is a direct descendant of a spreadsheet — an 8-tab
Excel workbook built for one 9th-grade athlete chasing a 15-stroke improvement — and the spreadsheet's
structure is the app's domain model. That workbook is the source of truth for what this product does.
When a design question comes up, ask "how did the workbook handle this?" first.

The core insight the workbook encodes, and which the app must preserve: **most strokes for a
developing golfer are lost to penalties, three-putts, and bad decisions, not to a bad swing.** The
app exists to make that leak visible and to close it. Every feature should ladder back to that.

---

## Working name

`Fairway`. Placeholder — do not spend session time on branding. If the owner renames it, the change
is confined to `package.json`, the root layout metadata, and `README.md`.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), TypeScript strict | Server Components by default; Client Components only where interactivity demands it |
| Database | Supabase Postgres | Migrations live in `supabase/migrations/`, checked in, never edited after merge |
| Auth | Supabase Auth | Email/password + magic link. OAuth deferred to V1 |
| Authorization | Postgres Row Level Security | **RLS is the authorization layer.** Never rely on app-side filtering alone |
| Styling | Tailwind CSS + shadcn/ui | The Clubhouse theme — tokens in `globals.css`, spec in `DESIGN.md` |
| Charts | Recharts | Reads `--chart-1`…`--chart-8` in fixed order — see `DESIGN.md` §3 |
| Forms | React Hook Form + Zod | Zod schemas are shared between client validation and server actions |
| Data mutations | Next.js Server Actions | No separate REST layer in MVP |
| Testing | Vitest (unit), Playwright (e2e) | RLS policies get their own pgTAP tests — see Definition of Done |
| Hosting | Vercel + Supabase cloud | Preview deploy per PR |

Pin versions at Session 1 and do not upgrade majors mid-backlog.

---

## The non-negotiable architectural rule

Every table that holds athlete data carries an `athlete_id`, and every one of those tables has RLS
policies enforcing that a row is visible only to:

1. the athlete who owns it,
2. users with an **accepted** `athlete_links` row granting access, at the permission level that row specifies, and
3. nobody else, ever.

There is no service-role query path in user-facing code. If you find yourself reaching for the
service role key to make a feature work, stop — the data model is wrong, not the policy.

Write the RLS policy in the **same migration** as the table. A table shipped without policies is a
data breach with a delay fuse.

---

## Users and roles

Three personas, one `auth.users` table, differentiated by profile and by links.

- **Athlete** — owns their data. Everything belongs to an athlete. Ages roughly 8–22, so the UI must
  work for a 10-year-old and not feel childish to a college player.
- **Parent / guardian** — linked to one or more athletes. Sees everything, can edit logistics
  (tournament registrations, costs), typically does not edit swing/practice content. For athletes
  under 13, a verified guardian link is **required before the account is usable** — see Compliance.
- **Coach** — linked to one or more athletes by invitation. Sees performance data, writes lesson
  notes and assigns drills. A coach never sees an athlete they are not linked to.

The `athlete_links` table is the join. Design it now with a nullable `team_id` so the V2 team layer
does not require a migration rewrite.

---

## Domain glossary

Use these words in code, in the database, and in the UI. Consistency here is worth more than elegance.

| Term | Meaning |
|---|---|
| **Round** | One recorded playing session. Types: `tournament`, `practice_round`, `simulated_tournament`, `nine_hole` |
| **Scoring average** | Mean score across **18-hole tournament rounds only**. This is the headline number. Practice rounds never touch it |
| **Event** | A planned or completed tournament on the athlete's schedule |
| **Tour** | The organization running events (NTPGA Medalist, FWJGA, TJGT…). A shared reference catalog |
| **Gap** | Days between consecutive planned events. The workbook's rule: never more than 60 |
| **Phase** | A block of the training year with its own focus and score target. The reference plan has five |
| **Leak** | A named source of lost strokes with a current range, a target, and strokes-saved value |
| **Practice session** | A logged training block. Types: `range_full_swing`, `range_wedges`, `short_game`, `putting`, `on_course`, `gym`, `lesson` |
| **Block** | A strength-training mesocycle (A, B, C in the reference plan) |
| **Up and down** | Getting into the hole in two strokes from off the green |
| **GIR** | Greens in regulation |

Avoid: "game", "match", "score card" as an entity name, "workout" and "exercise" used interchangeably.

---

## Conventions

**Database**

- `snake_case` tables and columns; plural table names.
- Every table: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`,
  `updated_at timestamptz` maintained by trigger.
- Dates that represent a calendar day (round date, event date) are `date`, not `timestamptz`. Golf
  happens on a day, not at an instant. This avoids an entire class of timezone bug.
- Money in integer cents. Never floats.
- Enums as Postgres `enum` types, not check constraints or free text.
- Nullable by default is wrong — mark columns `not null` unless there is a stated reason.

**TypeScript**

- Generate types from the database (`supabase gen types typescript`) into `types/database.ts`. Never
  hand-write a row type.
- Zod schemas live in `lib/schemas/`, one file per domain entity, exported and reused.
- No `any`. No non-null assertion (`!`) except immediately after an explicit guard.

**Next.js**

- Route groups: `(auth)` for signed-out, `(app)` for signed-in.
- Server Components fetch data. Client Components receive it as props.
- Mutations are Server Actions in `app/**/actions.ts`, each one re-validating input with the shared
  Zod schema. **Never trust the client, even though RLS is also protecting you.**
- Loading and error states are required for every route segment, not a follow-up ticket.

**Calculations**

All derived metrics — scoring average, gap days, strokes to goal, minutes by type — live in **pure
functions in `lib/stats/`** with unit tests. Not in components, not in SQL views initially. When a
metric needs to be fast at scale, it graduates to a materialized view, but the pure function stays
as the reference implementation and the test oracle.

The workbook's formulas are the spec for these. Port them exactly, including edge cases like
"average of zero rounds returns null, not 0" and "the last-3-tournaments average needs at least 3
tournaments or it returns null."

---

## Design principles for the UI

1. **The dashboard answers one question: am I getting there?** Scoring average, gap to goal, trend.
   Everything else is secondary navigation.
2. **Logging must take under 60 seconds on a phone in a parking lot.** This is the single highest-
   leverage UX constraint in the product. A round gets logged right after it is played or it never
   gets logged. Design the round entry form for thumbs, in sunlight, with a tired teenager.
3. **Progressive disclosure of stats.** A 10-year-old logs score and penalties. A college player logs
   strokes gained. Same form, expandable.
4. **Never show an empty chart.** Empty states explain what to do to fill them.
5. **Encouraging, never nagging.** The tone of the source workbook is honest and warm — "very
   achievable", "read that again". Match it. No streak-shaming, no red badges for a missed session.

---

## Compliance — read before building auth

This app collects data from minors. That is not a footnote.

- **COPPA** applies to users under 13 in the US. Verifiable parental consent is required before
  collecting personal information. In practice: an under-13 signup creates a pending account that
  cannot store data until a guardian completes the link flow. Build this in the MVP auth session,
  not later.
- **FERPA** may apply if the app is ever adopted by a school program. Keep education-record-adjacent
  data (team rosters, qualifying results) separable.
- Collect the minimum. There is no reason to store a home address, a phone number, or a school ID.
- No public profiles, no discovery, no athlete-to-athlete messaging in MVP or V1. The abuse surface
  is not worth it until there is moderation capacity.
- Photos/video: not in MVP. When added, they are private by default with no shareable public URL.

If a ticket seems to conflict with any of the above, flag it rather than implementing it.

---

## The design system

Full specification in `DESIGN.md`. Token values in `globals.css`. The rules that matter every session:

**Never hardcode a color.** Every color comes from a token. A hex literal in a component is a bug.

**`--border` and `--input` are not interchangeable.** `--border` is a decorative divider. `--input` is
a control boundary and meets 3:1 per WCAG 1.4.11. Anything a person operates — input, checkbox,
outline button, dashed empty-state frame — uses `--input`.

**Brass is a fill, not a text color.** `--secondary` at display lightness is 2.2:1 on white. Brass
text or a brass rule uses `--secondary-strong`.

**Signal Rose is sparing.** Gap warnings and exceptional results. It is not a decorative accent, and
`--accent-strong` is the variant for rose as text.

**Chart slots are assigned in fixed order and never cycled.** `--chart-1` through `--chart-8`, in
sequence. A filter that changes the series count must not repaint the survivors. Scatter, bubble, and
small-multiples cap at three series from the validated triad — see `DESIGN.md` §3.

**Status colors are reserved and always ship with an icon and a label.** Color alone never carries
meaning. A status color is never a chart series.

**Serif is `h1` and `h2` only.** `h3` and below are sans — a display face in a dense data view slows
scanning.

**Every token value in `globals.css` was contrast-checked and every chart slot colorblind-validated.**
Changing one requires re-running `pnpm test:contrast` and `pnpm test:palette`; both run in CI. Do not
adjust a value because it looks better in isolation.

**One `.metric-card-primary` per screen.** It is reserved for the "Am I getting there?" number and its
power comes from being the only one.

---

## The AI coach layer

Full specification in `AI_COACH.md`. Read it before touching anything in `lib/ai/`. The rules that
matter every session:

**The deterministic engine decides substance. The LLM decides voice.** The stats engine, the plan
engine, and the vetted content library determine what the athlete should do. The model phrases it for
this athlete's age and this coach's style. A model must never originate a prescription, a number, or
a fact. If you are writing a prompt that asks the model to decide something, stop.

**Exactly one function builds prompt context.** `buildAthleteContext()`. No prompt may be constructed
anywhere else. The context contains no name, school, city, date of birth, or free text authored by
another user — computed facts and vetted content only. Age is passed as a band, never a birth date.

**Gender is structured-use only.** Eligibility, tee selection, and strength-programming norms. It must
not influence tone, encouragement style, or assumed competitiveness, and there is a standing eval that
fails if it does.

**Coaches compose voice from a palette; coaches never write prompt text.** Bounded presets and
1–5 sliders mapping to curated fragments. Warmth has a floor of 2 regardless of setting. Technicality
is capped by age band.

**Banned outright at every age:** nutrition, weight, body composition, calories, supplements; medical
or injury advice; mental-health intervention; loads or progressions not in the vetted library;
comparison to a named athlete; any prediction about making a team, roster, college, or scholarship;
certainty about future scores.

**Every generation passes moderation and a grounding check.** The grounding check is mechanical —
every numeral in the output must appear in the context object. This catches confident, specific,
wrong, which is the failure mode that matters in a data product.

**Every AI surface has a deterministic fallback, and the fallback is built first.** The app must be
fully usable with the entire AI layer switched off, and that path is tested.

**Every generated message is labeled as AI and attributed to a style, not a person.** "Styled to Coach
Clark's approach," never "Coach Clark says." A coach opts in to voice attribution and can revoke it.

**Prompts are versioned code** in `lib/ai/prompts/`, reviewed in PRs, never edited in a dashboard.
The eval suite runs in CI on every prompt change.

---

## Definition of Done

A session's work is done when all of these are true:

- [ ] TypeScript compiles with zero errors, `strict: true`
- [ ] Lint passes
- [ ] Unit tests cover every new pure function in `lib/stats/`
- [ ] **Any new table has RLS enabled and a pgTAP test proving a non-linked user cannot read it**
- [ ] Loading and error states exist for new routes
- [ ] The feature works at 375px width
- [ ] Keyboard navigable; form inputs have labels; visible focus ring
- [ ] No hardcoded colors — every value from a design token
- [ ] Renders correctly in both light and dark mode
- [ ] Migration is checked in and runs clean on a fresh database
- [ ] `README.md` updated if setup steps changed
- [ ] **Any AI surface has a deterministic fallback, and the AI-disabled path is tested**

The RLS test is not optional and not deferrable. It is the one thing in this list that, if skipped,
turns a bug into a headline.

---

## How to run a session from the backlog

`BACKLOG.md` is organized into numbered sessions. Each is scoped to roughly one focused Claude Code
session and states its goal, dependencies, files to touch, and acceptance criteria.

1. Read this file and the session's entry in `BACKLOG.md`.
2. Confirm the sessions it depends on are complete.
3. Work only that session's scope. If you discover adjacent work, add it to the backlog rather than
   doing it — scope creep across sessions is what makes this kind of plan fall apart.
4. Finish against the Definition of Done before moving on.
5. Commit with `feat(session-N): <summary>`.

---

## Things that will tempt you and should be resisted

- **Building the team/coach dashboard early.** It is V2 for a reason. The schema supports it; the UI
  should not exist until single-athlete flows are genuinely good.
- **Auto-importing scores from GHIN or tour sites.** Every junior tour has a different, unstable,
  usually unauthenticated results page. Scraping them is a maintenance treadmill and likely violates
  their terms. Manual entry with a great form beats a fragile integration.
- **Gamification.** Badges and streaks are easy to add and hard to remove, and they push toward
  logging-as-performance rather than honest data. The workbook's motivation model is a visible gap to
  a real goal. That is enough.
- **A native app.** A well-built PWA covers the parking-lot logging case. Revisit only if offline
  capture proves inadequate.
- **Generalizing to other sports.** The value here is golf-specific depth.
- **Letting the model write the training plan.** It demos beautifully and it is the version where a
  language model prescribes squat loads to a fourteen-year-old. The plan engine decides; the model
  narrates.
- **A free-text style prompt for coaches.** It is the obvious feature and it is a prompt-injection
  channel pointed at a minor. Bounded parameters, always.
- **An LLM-generated push notification.** Ambient means present when the athlete arrives, not
  arriving unbidden.
