/**
 * Color math for the design-system CI checks (DESIGN.md §9).
 *
 * The token VALUES are read straight from `app/globals.css` — the file the app
 * actually compiles — so `test:contrast` and `test:palette` validate the
 * shipped theme, and editing a token to a failing value fails the build.
 *
 * WCAG contrast follows WCAG 2.1. Colorblind separation uses ΔE (CIE76) in
 * CIELAB between colors passed through the Machado et al. (2009) severity-1.0
 * dichromacy matrices. NOTE: the absolute ΔE figures this produces will not
 * match the numbers quoted in DESIGN.md §3 — those came from a different CVD
 * model. That is fine: this check enforces "as separable as the validated
 * palette, or better," with thresholds calibrated to it, and its job is to
 * catch a regression that collapses a pair, in a single consistent model.
 */
import { readFileSync } from "node:fs";

export interface Hsl {
  h: number;
  s: number;
  l: number;
}
export type TokenMap = Map<string, Hsl>;

/** Extract the `--token: H S% L%` triplets inside a single CSS selector block. */
function extractBlock(css: string, selector: string): TokenMap {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector "${selector}" not found`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (close === -1) throw new Error(`Unterminated block for "${selector}"`);
  const body = css.slice(open + 1, close);
  const map: TokenMap = new Map();
  const re = /--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const name = m[1];
    if (name === undefined) continue;
    map.set(name, { h: Number(m[2]), s: Number(m[3]), l: Number(m[4]) });
  }
  return map;
}

/** Parse both the `:root` (light) and `.dark` token maps from a CSS file. */
export function parseTokens(cssPath: string): {
  light: TokenMap;
  dark: TokenMap;
} {
  const css = readFileSync(cssPath, "utf8");
  return {
    light: extractBlock(css, ":root"),
    dark: extractBlock(css, ".dark"),
  };
}

export type Rgb = { r: number; g: number; b: number }; // 0..1

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lN - c / 2;
  return { r: r + m, g: g + m, b: b + m };
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/** WCAG 2.1 contrast ratio between two sRGB colors. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// --- CIELAB (D65) --------------------------------------------------------
type Lab = { L: number; a: number; b: number };

function linearRgbToXyz({ r, g, b }: Rgb): [number, number, number] {
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ];
}

function xyzToLab([x, y, z]: [number, number, number]): Lab {
  // D65 reference white.
  const xr = x / 0.95047;
  const yr = y / 1.0;
  const zr = z / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(xr);
  const fy = f(yr);
  const fz = f(zr);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function rgbToLinear({ r, g, b }: Rgb): Rgb {
  return { r: srgbToLinear(r), g: srgbToLinear(g), b: srgbToLinear(b) };
}

function labFromLinear(lin: Rgb): Lab {
  return xyzToLab(linearRgbToXyz(lin));
}

export function deltaE76(a: Lab, b: Lab): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

// --- Colorblind simulation (Machado 2009, severity 1.0) ------------------
export type Cvd = "protanopia" | "deuteranopia" | "tritanopia";

type Row3 = readonly [number, number, number];
type Mat3 = readonly [Row3, Row3, Row3];

// Tuple-typed so literal indexing stays `number` under noUncheckedIndexedAccess.
const CVD_MATRICES: Record<Cvd, Mat3> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/** Simulate a dichromat's perception, returning a Lab value (via linear RGB). */
function simulateLab(rgb: Rgb, cvd: Cvd): Lab {
  const lin = rgbToLinear(rgb);
  const m = CVD_MATRICES[cvd];
  const sim: Rgb = {
    r: m[0][0] * lin.r + m[0][1] * lin.g + m[0][2] * lin.b,
    g: m[1][0] * lin.r + m[1][1] * lin.g + m[1][2] * lin.b,
    b: m[2][0] * lin.r + m[2][1] * lin.g + m[2][2] * lin.b,
  };
  return labFromLinear(sim);
}

export const CVD_TYPES: Cvd[] = ["protanopia", "deuteranopia", "tritanopia"];

/** Normal-vision Lab for an sRGB color. */
export function labOf(rgb: Rgb): Lab {
  return labFromLinear(rgbToLinear(rgb));
}

/** ΔE between two colors as seen by a given CVD type. */
export function cvdDeltaE(a: Rgb, b: Rgb, cvd: Cvd): number {
  return deltaE76(simulateLab(a, cvd), simulateLab(b, cvd));
}
