/**
 * test:contrast — asserts every meaningful color pair in DESIGN.md §2 meets its
 * WCAG ratio in BOTH light and dark, reading the live token values from
 * `app/globals.css`. Text pairs must clear 4.5:1; control boundaries 3:1.
 *
 * This runs in CI. Editing a token to a value that breaks a documented pair
 * fails the build — which is the whole point of shipping the check with the
 * theme (DESIGN.md §9).
 */
import { fileURLToPath } from "node:url";
import { contrastRatio, hslToRgb, parseTokens, type TokenMap } from "./color";

const TEXT = 4.5; // WCAG AA, normal text
const UI = 3.0; // WCAG 1.4.11, control boundaries and non-text

interface Pair {
  fg: string;
  bg: string;
  min: number;
  note: string;
}

/**
 * Pairs are the ones DESIGN.md §2 makes claims about. `--border` is deliberately
 * absent: it is decorative and documented as below the 3:1 control minimum, so
 * `--input` carries every control boundary instead.
 */
const PAIRS: Pair[] = [
  {
    fg: "foreground",
    bg: "background",
    min: TEXT,
    note: "body text on app bg",
  },
  { fg: "foreground", bg: "card", min: TEXT, note: "body text on card" },
  {
    fg: "muted-foreground",
    bg: "muted",
    min: TEXT,
    note: "secondary text on sage",
  },
  {
    fg: "muted-foreground",
    bg: "background",
    min: TEXT,
    note: "secondary text on parchment",
  },
  {
    fg: "primary-foreground",
    bg: "primary",
    min: TEXT,
    note: "white on Fairway Green",
  },
  {
    fg: "secondary-strong",
    bg: "card",
    min: TEXT,
    note: "brass as text on card",
  },
  {
    fg: "accent-foreground",
    bg: "accent",
    min: TEXT,
    note: "white on Signal Rose fill",
  },
  {
    fg: "accent-strong",
    bg: "card",
    min: TEXT,
    note: "rose as text on card",
  },
  {
    fg: "accent-strong",
    bg: "background",
    min: TEXT,
    note: "rose as text on app bg",
  },
  {
    fg: "success-foreground",
    bg: "success",
    min: TEXT,
    note: "on success fill",
  },
  { fg: "success", bg: "card", min: TEXT, note: "success as text on card" },
  {
    fg: "warning-foreground",
    bg: "warning",
    min: TEXT,
    note: "on warning fill",
  },
  { fg: "warning", bg: "card", min: TEXT, note: "warning as text on card" },
  {
    fg: "destructive-foreground",
    bg: "destructive",
    min: TEXT,
    note: "on destructive fill",
  },
  {
    fg: "destructive",
    bg: "card",
    min: TEXT,
    note: "destructive as text on card",
  },
  { fg: "input", bg: "card", min: UI, note: "control boundary on card" },
  {
    fg: "input",
    bg: "background",
    min: UI,
    note: "control boundary on parchment",
  },
];

function ratio(tokens: TokenMap, fg: string, bg: string): number {
  const f = tokens.get(fg);
  const b = tokens.get(bg);
  if (!f) throw new Error(`Missing token --${fg}`);
  if (!b) throw new Error(`Missing token --${bg}`);
  return contrastRatio(hslToRgb(f), hslToRgb(b));
}

function checkMode(name: string, tokens: TokenMap): string[] {
  const failures: string[] = [];
  process.stdout.write(`\n  ${name}\n`);
  for (const p of PAIRS) {
    const r = ratio(tokens, p.fg, p.bg);
    const ok = r >= p.min - 1e-9;
    const mark = ok ? "✓" : "✗";
    process.stdout.write(
      `    ${mark} ${r.toFixed(2).padStart(5)}:1  (need ${p.min.toFixed(1)})  --${p.fg} on --${p.bg}  ${p.note}\n`,
    );
    if (!ok) {
      failures.push(
        `${name}: --${p.fg} on --${p.bg} is ${r.toFixed(2)}:1, needs ${p.min.toFixed(1)}:1 (${p.note})`,
      );
    }
  }
  return failures;
}

function main(): void {
  const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));
  const { light, dark } = parseTokens(cssPath);
  process.stdout.write("Contrast — DESIGN.md §2");
  const failures = [...checkMode("light", light), ...checkMode("dark", dark)];
  if (failures.length > 0) {
    process.stderr.write(
      `\n✗ ${failures.length} contrast failure(s):\n${failures.map((f) => `   - ${f}`).join("\n")}\n`,
    );
    process.exit(1);
  }
  process.stdout.write("\n✓ All contrast pairs pass in both modes.\n");
}

main();
