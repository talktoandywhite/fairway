import type { Metadata } from "next";
import { Flag, TrendingDown, TriangleAlert } from "lucide-react";
import { AiNote } from "@/components/ui/ai-note";
import { Button } from "@/components/ui/button";
import { DataValue } from "@/components/ui/data-value";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, MetricCardPrimary } from "@/components/ui/metric-card";
import { ScorecardTable } from "@/components/ui/scorecard-table";
import { FairwayBarChart } from "@/components/charts/bar-chart";
import { FairwayLineChart } from "@/components/charts/line-chart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Styleguide — Fairway",
};

/** Practice-mix: seven session types — exactly why eight chart slots exist. */
const PRACTICE_MIX = [
  { week: "W1", range: 90, wedges: 45, short: 60, putting: 40, course: 0 },
  { week: "W2", range: 60, wedges: 60, short: 75, putting: 55, course: 90 },
  { week: "W3", range: 45, wedges: 30, short: 90, putting: 60, course: 0 },
  { week: "W4", range: 30, wedges: 45, short: 60, putting: 70, course: 120 },
];

const SCORING_TREND = [
  { event: "Sep", avg: 82 },
  { event: "Oct", avg: 80 },
  { event: "Nov", avg: 81 },
  { event: "Feb", avg: 78 },
  { event: "Mar", avg: 77 },
  { event: "Apr", avg: 75 },
];

const FILL_TOKENS = [
  "background",
  "card",
  "muted",
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "destructive",
  "border",
  "input",
] as const;

const TEXT_TOKENS = [
  { token: "foreground", label: "Foreground" },
  { token: "muted-foreground", label: "Muted foreground" },
  { token: "secondary-strong", label: "Brass (text)" },
  { token: "accent-strong", label: "Signal Rose (text)" },
] as const;

const CHART_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function Swatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-12 w-full rounded-md border border-border"
        style={{ background: `hsl(var(--${token}))` }}
      />
      <code className="text-xs text-muted-foreground">--{token}</code>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** The complete component/token showcase, rendered once per color mode. */
function Showcase() {
  return (
    <div className="flex flex-col gap-8">
      <Section title="Typography">
        <h1>Am I getting there?</h1>
        <h2>The Clubhouse</h2>
        <h3>Section header (sans)</h3>
        <h4>Subsection header (sans)</h4>
        <p className="text-sm text-foreground">
          Body copy in Inter. Honest and warm, never nagging — the tone of the
          source workbook.
        </p>
        <p className="text-sm text-muted-foreground">
          Secondary copy in muted foreground.
        </p>
        <p className="flex items-baseline gap-3">
          <DataValue className="text-3xl">74.6</DataValue>
          <span className="text-sm text-muted-foreground">
            scoring average (JetBrains Mono, tabular)
          </span>
        </p>
      </Section>

      <Section title="Color — fills & lines">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {FILL_TOKENS.map((t) => (
            <Swatch key={t} token={t} />
          ))}
        </div>
      </Section>

      <Section title="Color — text">
        <div className="flex flex-col gap-1">
          {TEXT_TOKENS.map((t) => (
            <p
              key={t.token}
              className="text-lg font-semibold"
              style={{ color: `hsl(var(--${t.token}))` }}
            >
              {t.label} — the quick brown fox
            </p>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Log a round</Button>
          <Button variant="secondary">View plan</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Metric cards">
        <MetricCardPrimary
          label="Scoring average"
          value="74.6"
          hint="Goal 72.0 · 2.6 strokes to go"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="Last 3 tournaments" value="76.3" hint="↓ 1.8" />
          <MetricCard label="GIR" value="52%" hint="of greens in reg." />
          <MetricCard label="Up & down" value="41%" hint="from off the green" />
        </div>
      </Section>

      <Section title="Scorecard table">
        <ScorecardTable>
          <thead>
            <tr>
              <th>Hole</th>
              <th>Par</th>
              <th>Score</th>
              <th>Putts</th>
              <th>Penalties</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td className="numeric">4</td>
              <td className="numeric">5</td>
              <td className="numeric">2</td>
              <td className="numeric">0</td>
            </tr>
            <tr>
              <td>2</td>
              <td className="numeric">3</td>
              <td className="numeric">3</td>
              <td className="numeric">1</td>
              <td className="numeric">0</td>
            </tr>
            <tr>
              <td>3</td>
              <td className="numeric">5</td>
              <td className="numeric">7</td>
              <td className="numeric">2</td>
              <td className="numeric">1</td>
            </tr>
          </tbody>
        </ScorecardTable>
      </Section>

      <Section title="Status — always icon + label">
        <div className="flex flex-col gap-2 text-sm font-medium">
          <span className="status-success inline-flex items-center gap-1.5">
            <Flag className="size-4" aria-hidden="true" /> On track
          </span>
          <span className="status-warning inline-flex items-center gap-1.5">
            <TriangleAlert className="size-4" aria-hidden="true" /> Gap
            approaching 60 days
          </span>
          <span className="status-critical inline-flex items-center gap-1.5">
            <TrendingDown className="size-4" aria-hidden="true" /> Missed target
          </span>
        </div>
        <div className="gap-warning">
          <TriangleAlert className="size-4" aria-hidden="true" />
          58 days since your last event — schedule one within 2 days.
        </div>
      </Section>

      <Section title="AI coach note">
        <AiNote styleLabel="Coach Clark's approach">
          Your three-putts are down since February — that short-game block is
          working. Keep the lag-putting drill in this week&apos;s rotation.
        </AiNote>
        <AiNote variant="fallback">
          Three-putts: 4 last round, down from a 7-round average of 6. Putting
          practice this week: 70 minutes.
        </AiNote>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={<Flag className="size-6" aria-hidden="true" />}
          title="No tournament rounds yet"
          hint="Log three 18-hole tournament rounds to see your scoring average."
          action={<Button variant="secondary">Log a round</Button>}
        />
      </Section>

      <Section title="Charts — fixed slot order">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {CHART_SLOTS.map((n) => (
            <div key={n} className="flex flex-col gap-1">
              <div
                className="h-10 w-full rounded"
                style={{ background: `hsl(var(--chart-${n}))` }}
              />
              <code className="text-xs text-muted-foreground">{n}</code>
            </div>
          ))}
        </div>
        <div className="metric-card">
          <h4 className="mb-2">Scoring trend</h4>
          <FairwayLineChart
            data={SCORING_TREND}
            categoryKey="event"
            series={[{ key: "avg", label: "Tournament avg" }]}
            ariaLabel="Scoring average trend by month"
          />
        </div>
        <div className="metric-card">
          <h4 className="mb-2">Practice mix — minutes by type</h4>
          <FairwayBarChart
            data={PRACTICE_MIX}
            categoryKey="week"
            stacked
            series={[
              { key: "range", label: "Range" },
              { key: "wedges", label: "Wedges" },
              { key: "short", label: "Short game" },
              { key: "putting", label: "Putting" },
              { key: "course", label: "On course" },
            ]}
            ariaLabel="Practice minutes by session type, stacked by week"
          />
        </div>
      </Section>
    </div>
  );
}

function Panel({ mode }: { mode: "light" | "dark" }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-background p-5 text-foreground",
        mode === "dark" && "dark",
      )}
    >
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {mode} mode
      </p>
      <Showcase />
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Styleguide</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every token, component, and chart form in the Clubhouse design system,
          rendered in both modes. This page is the fastest way to catch a
          regression — see DESIGN.md. Contrast and colorblind separation are
          enforced by <code>pnpm test:contrast</code> and{" "}
          <code>pnpm test:palette</code>.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel mode="light" />
        <Panel mode="dark" />
      </div>
    </div>
  );
}
