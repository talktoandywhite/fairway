# DESIGN.md — The Clubhouse

The Fairway design system. This file is canonical: it reconciles the brand guidelines, the design
direction, and the stylesheet into one specification that Claude Code sessions build against.

Read alongside [`CLAUDE.md`](./CLAUDE.md). Token values live in [`globals.css`](./globals.css).

---

## 1. The aesthetic

**The Clubhouse.** Classic golf heritage rendered as clean modern software. Warm parchment instead of
stark digital white, a deep green that reads as fairway grass, serif display type for weight and
tradition, and monospaced figures because numbers are the point.

The promise is **"this matters."** Fairway treats an athlete's work with respect. It is not a game
with a golf skin; it is a tool for people who are trying to get somewhere specific.

Three tensions the design has to hold at once:

- **A ten-year-old and a college player use the same screens.** Clean by default, complex on request.
- **Parents and coaches need to trust it on sight.** It should look like a serious instrument.
- **It gets used in a parking lot, in sunlight, one-handed, by someone tired.** Legibility beats
  elegance every time the two conflict.

---

## 2. Color

The palette is unchanged in character from the original direction. Several values were adjusted so
that everything carrying meaning is actually readable — see §9 for what moved and why.

### Core

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `#F6F4EE` Parchment | `#0C1D13` | App background |
| `--foreground` | `#173624` Deep Pine | `#F1EEE4` | Primary text |
| `--card` | `#FFFFFF` | `#14291D` | Reading surface for data |
| `--primary` | `#195733` Fairway Green | `#3FA66A` | Primary actions, active states, key data |
| `--secondary` | `#D1A847` Brass | `#AC8A39` | Secondary actions, achievements — **fill only** |
| `--secondary-strong` | `#937225` | lighter brass | Brass **as text or a rule** |
| `--accent` | `#DA2F68` Signal Rose | `#D9688E` | Gap warnings, exceptional results — **sparing** |
| `--accent-strong` | `#D42560` | same | Rose **as text** on any surface |
| `--muted` | `#E7EFEA` Soft Sage | `#203C2C` | Secondary surfaces |
| `--muted-foreground` | `#4B715B` | `#94B8A3` | Secondary text |
| `--border` | `#BCD2C5` | `#2E563F` | Decorative dividers |
| `--input` | `#649679` | `#427B5A` | **Control boundaries** — 3:1, required |

### Two rules that are easy to get wrong

**Brass is a fill, not a text color.** At its display lightness brass sits at 2.2:1 on white. Any
brass text or brass rule uses `--secondary-strong`. This is why the AI-note left border is
`--secondary-strong` and not `--secondary` — the original spec's brass rule was invisible against a
white card.

**`--border` and `--input` are different tokens on purpose.** A hairline separating two rows of a
table is decorative and may be soft. The edge of a text input is how a user knows where to tap, and
WCAG 1.4.11 requires 3:1 for it. Use `--input` on anything a person operates.

### Status — reserved

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--success` | `#14713B` | `#4DCB82` | Goal met, homework done, on track |
| `--warning` | `#975D0C` | `#EAAB3E` | Gap approaching 60 days, ratio off |
| `--destructive` | `#B81E1E` | `#DF6868` | Destructive action, hard failure |

**Status colors always ship with an icon and a text label.** Color alone never carries the meaning —
required for colorblind users, and the reason a red/rose adjacency isn't a problem in practice.

Status colors are never used for a chart series, and a chart series never wears a status color unless
the series genuinely means good-or-bad.

---

## 3. Charts

Eight categorical slots, **fixed order, assigned in sequence, never cycled and never reordered.**
The ordering is the colorblind-safety mechanism, not a style choice.

| Slot | Hue | Light | Dark |
|---|---|---|---|
| 1 | green | `#1B7E44` | `#259353` |
| 2 | cyan | `#1C9AC4` | `#1B93BB` |
| 3 | terracotta | `#D05E25` | `#D87646` |
| 4 | plum | `#8A1FAD` | `#B640DD` |
| 5 | olive | `#657E1B` | `#7C962C` |
| 6 | slate | `#1F5AAD` | `#2671D9` |
| 7 | rose | `#AD1F4E` | `#DC386E` |
| 8 | brass | `#8F6A14` | `#B98D27` |

Validated on the card surface in both modes: worst adjacent CVD ΔE **8.3 light / 10.6 dark** (≥8
target), worst adjacent normal-vision ΔE **18.9 light / 15.6 dark** (≥15 floor), all eight ≥ 3:1
against the surface. Dark steps are stepped for the dark surface, not flipped.

**Series cap for all-pairs forms.** Scatter, bubble, and small-multiples charts let any two marks sit
side by side, which is a harder test than adjacency. The eight-slot order does not clear it — green
and terracotta collapse under protanopia (ΔE 3.1). For those forms use at most **three** series from
the validated triad **cyan + rose + brass**, or facet instead. Bar, line, and stacked charts use the
standard order and are unaffected.

**Practice-mix charts have seven categories** — one per session type — which is exactly why the eight
slots exist. Assign them in the fixed order and leave them assigned; a filter that changes which
types appear must not repaint the survivors.

Other chart rules: one y-axis, never two. Sequential encoding is one hue light-to-dark; diverging is
two hues with a gray midpoint. Grid and axis lines are recessive (`--chart-grid`, `--chart-axis`).
Values and labels wear text tokens, never the series color. A legend is present for two or more
series. Every chart has a table view.

---

## 4. Typography

| Role | Family | Used for |
|---|---|---|
| Display | Playfair Display (serif) | `h1`, `h2`, marketing, hero |
| UI | Inter (sans) | `h3` and below, body, buttons, labels, navigation |
| Data | JetBrains Mono | Scores, metrics, table figures, axis ticks |

**`h3` and `h4` are sans, not serif.** The original rule applied the serif to `h3` as well, which puts
a display face on section headers inside dense data views and slows scanning. Serif is for page-level
titles.

All figures use `font-variant-numeric: tabular-nums` so columns align and a live-updating number
doesn't jitter as digits change width.

**Three families is a real payload.** Load Inter and JetBrains Mono as variable fonts, subset
Playfair Display to Latin and the weights actually used, `font-display: swap` on all three, and
preload only Inter. This matters more than usual because the app's defining moment is a phone on
course wifi.

---

## 5. Components

**Buttons.** Primary is solid Fairway Green with white text. Secondary is an outline in
`--secondary-strong` with Deep Pine text. Ghost is text-only for cancel and skip. Minimum height
44px, all variants, no exceptions.

**Cards.** White on parchment with a soft border and a one-pixel inset highlight that lifts them off
the page. The inset is mode-aware — a hardcoded white highlight draws a bright line across every card
in dark mode.

**Primary metric card.** Fairway Green with white text, gradient, reserved for the single "Am I
getting there?" number. **One per screen.** Its power comes from being the only one.

**Scorecard tables.** Uppercase tracked-out headers on the sage surface, hairline row borders,
monospace right-aligned numerics, subtle row hover. Should read like a physical scorecard.

**Inputs.** 44px minimum, white background, `--input` border, Fairway Green focus ring. Numeric fields
open a numeric keypad. Large tap targets and steppers wherever a stepper beats typing.

**Empty states.** A dashed `--input` border, a title, and a hint that says what to do — *"Log three
tournament rounds to see your average."* Never a blank chart, never a zero standing in for no data.

---

## 6. AI messages

The design system and [`AI_COACH.md`](./AI_COACH.md) have to agree here, and the original spec's
labels — "Coach Notes", "Plan Summary" — read as though the coach wrote them.

**The label is text, it is visible, and it says AI.** Attribution is to the style, not the person:

> **AI COACH NOTE** · styled to Coach Clark's approach

Never "Coach Clark says." A message written by a model, appearing in a named coach's voice, to a
minor who may act on it believing their coach said it, is a trust failure regardless of how good the
message is.

Visual treatment: `.ai-note` — a three-pixel `--secondary-strong` left rule on a soft sage wash. Every
note carries a feedback control. With the AI layer disabled, the same container renders the
deterministic fallback and the label changes accordingly.

---

## 7. Motion

Restrained. Transitions 150–200ms ease-out for state changes, 250ms for entrances. No decorative
animation, no celebratory bursts — the tone is encouraging, not gamified. `prefers-reduced-motion`
is honored globally in `globals.css`.

---

## 8. Accessibility floor

Non-negotiable, and part of the Definition of Done:

- Text 4.5:1, large text 3:1, control boundaries and chart marks 3:1
- Visible `:focus-visible` ring on every interactive element
- 44px minimum touch targets
- Status and series identity never carried by color alone
- Works at 375px
- Keyboard navigable, all inputs labelled
- `prefers-reduced-motion` honored

---

## 9. What changed from the original system, and why

Seven WCAG failures, one rendering bug, and a token mismatch. Everything below is a corrected value or
a clarified rule; the character of the palette is intact.

| # | Issue | Was | Now |
|---|---|---|---|
| 1 | Rose on white failed AA — and it's assigned to *alerts* | 3.7:1 | `--accent` at 52% L → 4.6:1; `--accent-strong` for text |
| 2 | Rose as text on cards failed in dark mode | 3.6:1 | 63% L → 4.6:1 |
| 3 | Borders far below the 3:1 control minimum | 1.29:1 light, 1.53:1 dark | Split into `--border` (decorative) and `--input` (3.1–3.5:1) |
| 4 | Muted text on the sage surface failed | 4.12:1 | 37% L → 4.7:1 |
| 5 | Brass unusable as text | 2.24:1 | `--secondary-strong` at 36% L → 4.5:1 |
| 6 | Dark-mode critical text failed | 3.78:1 | 64% L → 4.6:1 |
| 7 | `.metric-card` hardcoded a white inset shadow | bright line across every dark card | Mode-aware inset |
| 8 | Rose hex and HSL disagreed | `#E06C88` vs `#E05281` | One value, `#DA2F68`, defined once |
| 9 | Parchment hex and HSL disagreed | `#F8F6F0` vs `#FAF8F5` | Aligned to the brand hex |
| 10 | No chart tokens | — | Eight validated slots, both modes |
| 11 | No semantic status tokens | rose doubled as achievement *and* alert | `--success`, `--warning`, `--destructive`, all reserved |
| 12 | Serif applied through `h3` | display face in dense tables | Serif for `h1`/`h2` only |
| 13 | No focus, touch-target, or reduced-motion rules | — | All three in base layer |
| 14 | AI label read as human-authored | "Coach Notes" | "AI Coach Note · styled to…" |

### The naming change

Token names and brand language were moved off explicit tournament references — `Augusta Green` →
**Fairway Green**, `Azalea Pink` → **Signal Rose**, "Modern Masters" → **The Clubhouse**. The colors
themselves are unchanged in character.

The reason is not design. Augusta National enforces its trademarks aggressively, and a commercial
product aimed at golfers whose written brand guidelines describe it as "heavily inspired by The
Masters Tournament" has documented an intent to associate. That document is the liability, not the
green. Renaming costs nothing visually and removes the exposure. *Not legal advice — worth a lawyer's
eye before any public launch.*

### Re-running the checks

Any change to a color token requires re-validation before merge:

```bash
# Text and UI contrast — every pair in §2
pnpm test:contrast

# Chart slots — colorblind separation, both modes
node scripts/validate_palette.js "$(cat chart-slots-light.txt)" --mode light --surface "#FFFFFF"
node scripts/validate_palette.js "$(cat chart-slots-dark.txt)"  --mode dark  --surface "#14291D"
```

Both run in CI. A palette change that fails either does not merge.

---

## 10. Open items

- **Tailwind version.** `globals.css` uses v3 directives. Current shadcn/ui defaults to v4 with
  `@theme inline`. Pin one in Session 1 and stay there — mixing them is a bad afternoon.
- **Fairway Green drift.** The brand doc says `#195736`; `hsl(145 55% 22%)` renders `#195733`. Visually
  identical, but pick one canonical value and record it.
- **Chart slot 1 vs `--success`.** Both are greens and sit close. Fine given status always carries an
  icon and label, but don't put them in the same chart without one.
- **Sunlight testing.** Every ratio here clears WCAG on a calibrated screen. WCAG does not model a
  phone at 400 nits in direct August sun in Texas. Test the round-entry form outdoors before calling
  Session 8 done.
