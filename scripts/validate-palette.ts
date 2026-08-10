/**
 * test:palette — runs the eight chart slots through a colorblind validator in
 * both modes (DESIGN.md §3), reading the live values from `app/globals.css`.
 *
 * Three checks per mode:
 *   1. Every slot clears 3:1 against its card surface (a mark you can't see
 *      against the surface is not a color choice).
 *   2. Adjacent slots stay separable — both to normal vision and to each
 *      dichromacy type — because the slots are assigned in fixed sequence and a
 *      chart routinely places slot N beside slot N+1.
 *   3. The all-pairs triad (cyan + rose + brass) stays separable for EVERY pair
 *      under every CVD type, since scatter/bubble/small-multiples let any two
 *      marks sit together — the harder test the full eight-slot order fails.
 *
 * ΔE is CIE76 in CIELAB under the Machado-2009 dichromacy model. The absolute
 * numbers differ from DESIGN.md §3 (a different model produced those); the
 * floors below are calibrated to the shipped palette with margin, so a
 * regression that collapses a pair fails the build while the validated palette
 * passes. See scripts/color.ts.
 */
import { fileURLToPath } from "node:url";
import {
  contrastRatio,
  cvdDeltaE,
  CVD_TYPES,
  deltaE76,
  hslToRgb,
  labOf,
  parseTokens,
  type Rgb,
  type TokenMap,
} from "./color";

// Calibrated floors — see header. Set below the shipped palette's measured
// separation so it passes with margin; a collapsed pair drops under them.
const CONTRAST_FLOOR = 3.0; // slot vs surface, WCAG non-text
const ADJ_NORMAL_FLOOR = 15; // adjacent slots, normal vision
const ADJ_CVD_FLOOR = 8; // adjacent slots, worst dichromacy (measured min 15.1)
const TRIAD_CVD_FLOOR = 8; // all triad pairs, worst dichromacy (measured min 25.8)

const SLOT_KEYS = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
];
// Triad = cyan (slot 2), rose (slot 7), brass (slot 8) — 0-based indices.
const TRIAD_INDICES = [1, 6, 7];

function slotsOf(tokens: TokenMap): Rgb[] {
  return SLOT_KEYS.map((k) => {
    const hsl = tokens.get(k);
    if (!hsl) throw new Error(`Missing token --${k}`);
    return hslToRgb(hsl);
  });
}

function worstCvd(a: Rgb, b: Rgb): number {
  return Math.min(...CVD_TYPES.map((t) => cvdDeltaE(a, b, t)));
}

function checkMode(name: string, tokens: TokenMap, surface: Rgb): string[] {
  const slots = slotsOf(tokens);
  const failures: string[] = [];
  process.stdout.write(`\n  ${name} (surface ${surfaceLabel(name)})\n`);

  // 1. Contrast against surface.
  slots.forEach((c, i) => {
    const r = contrastRatio(c, surface);
    const ok = r >= CONTRAST_FLOOR - 1e-9;
    process.stdout.write(
      `    ${ok ? "✓" : "✗"} slot ${i + 1} vs surface ${r.toFixed(2)}:1 (need ${CONTRAST_FLOOR})\n`,
    );
    if (!ok)
      failures.push(
        `${name}: slot ${i + 1} is ${r.toFixed(2)}:1 on surface, needs ${CONTRAST_FLOOR}`,
      );
  });

  // 2. Adjacent separation, normal + worst CVD.
  let worstAdjNormal = Infinity;
  let worstAdjCvd = Infinity;
  for (let i = 0; i < slots.length - 1; i++) {
    const a = slots[i];
    const b = slots[i + 1];
    if (!a || !b) continue;
    const dn = deltaE76(labOf(a), labOf(b));
    const dc = worstCvd(a, b);
    worstAdjNormal = Math.min(worstAdjNormal, dn);
    worstAdjCvd = Math.min(worstAdjCvd, dc);
    if (dn < ADJ_NORMAL_FLOOR - 1e-9)
      failures.push(
        `${name}: adjacent slots ${i + 1}/${i + 2} normal ΔE ${dn.toFixed(1)} < ${ADJ_NORMAL_FLOOR}`,
      );
    if (dc < ADJ_CVD_FLOOR - 1e-9)
      failures.push(
        `${name}: adjacent slots ${i + 1}/${i + 2} CVD ΔE ${dc.toFixed(1)} < ${ADJ_CVD_FLOOR}`,
      );
  }
  process.stdout.write(
    `    worst adjacent: normal ΔE ${worstAdjNormal.toFixed(1)} (need ${ADJ_NORMAL_FLOOR}), CVD ΔE ${worstAdjCvd.toFixed(1)} (need ${ADJ_CVD_FLOOR})\n`,
  );

  // 3. Triad all-pairs, worst CVD.
  let worstTriad = Infinity;
  for (let a = 0; a < TRIAD_INDICES.length; a++) {
    for (let b = a + 1; b < TRIAD_INDICES.length; b++) {
      const ia = TRIAD_INDICES[a];
      const ib = TRIAD_INDICES[b];
      if (ia === undefined || ib === undefined) continue;
      const ca = slots[ia];
      const cb = slots[ib];
      if (!ca || !cb) continue;
      const dc = worstCvd(ca, cb);
      worstTriad = Math.min(worstTriad, dc);
      if (dc < TRIAD_CVD_FLOOR - 1e-9)
        failures.push(
          `${name}: triad slots ${ia + 1}/${ib + 1} CVD ΔE ${dc.toFixed(1)} < ${TRIAD_CVD_FLOOR}`,
        );
    }
  }
  process.stdout.write(
    `    triad (2,7,8) worst-pair CVD ΔE ${worstTriad.toFixed(1)} (need ${TRIAD_CVD_FLOOR})\n`,
  );

  return failures;
}

function surfaceLabel(mode: string): string {
  return mode === "light" ? "#FFFFFF card" : "#14291D card";
}

function main(): void {
  const cssPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));
  const { light, dark } = parseTokens(cssPath);
  // Card surfaces, per DESIGN.md §3.
  const lightSurface = hslToRgb({ h: 0, s: 0, l: 100 });
  const darkCard = dark.get("card");
  if (!darkCard) throw new Error("Missing --card in .dark");
  const darkSurface = hslToRgb(darkCard);

  process.stdout.write("Chart palette — DESIGN.md §3");
  const failures = [
    ...checkMode("light", light, lightSurface),
    ...checkMode("dark", dark, darkSurface),
  ];
  if (failures.length > 0) {
    process.stderr.write(
      `\n✗ ${failures.length} palette failure(s):\n${failures.map((f) => `   - ${f}`).join("\n")}\n`,
    );
    process.exit(1);
  }
  process.stdout.write("\n✓ Chart palette passes in both modes.\n");
}

main();
