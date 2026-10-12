/**
 * A guard between Telegram's theme and the page (WCAG 2.x, level AA). Telegram's colors are chosen by
 * Telegram's clients and by people who make their own themes; nobody checked them against how this
 * application uses them. Before they replace the nine base tokens, each pair the application draws with
 * them is measured, and a pair that falls below its threshold is replaced by the design system's own
 * colors for the theme's scheme (tokens.css). What Telegram's theme does well is kept as it is.
 *
 * Pure: no document, no bridge. `telegram.ts` applies the result.
 */

export type Scheme = "light" | "dark";

/** The nine base tokens Telegram's theme replaces. */
export const BASE_TOKENS = [
  "--hb-bg",
  "--hb-surface",
  "--hb-text",
  "--hb-muted",
  "--hb-link",
  "--hb-accent",
  "--hb-on-accent",
  "--hb-border",
  "--hb-focus",
] as const;
export type BaseToken = (typeof BASE_TOKENS)[number];
export type BaseColors = Readonly<Record<BaseToken, string>>;

/**
 * The design system's values of the nine tokens, as tokens.css has them. A copy, because the guard must
 * know the color it falls back to in order to measure the next pair against it;
 * telegramContrast.test.ts fails when the two differ.
 */
export const DESIGN: Readonly<Record<Scheme, BaseColors>> = {
  light: {
    "--hb-bg": "#f7f8fc",
    "--hb-surface": "#ffffff",
    "--hb-text": "#14162e",
    "--hb-muted": "#4f5476",
    "--hb-link": "#4b3fd6",
    "--hb-accent": "#4b3fd6",
    "--hb-on-accent": "#ffffff",
    "--hb-border": "#76829a",
    "--hb-focus": "#4b3fd6",
  },
  dark: {
    "--hb-bg": "#14152a",
    "--hb-surface": "#1c1e36",
    "--hb-text": "#e9ebf5",
    "--hb-muted": "#a3aac6",
    "--hb-link": "#8b7cf6",
    "--hb-accent": "#8b7cf6",
    "--hb-on-accent": "#14152a",
    "--hb-border": "#7e8aa0",
    "--hb-focus": "#a99cf9",
  },
};

/** Text against its ground. */
export const AA_TEXT = 4.5;
/** A boundary or a shape that is not text (a field's border, the focus ring, a button against the page). */
export const AA_NON_TEXT = 3;

/** Below this luminance a background reads as dark: light text on it has the better contrast. */
export const DARK_BACKGROUND = 0.18;

/** Relative luminance (WCAG) of a six-digit hex color. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

/** Contrast ratio (WCAG) of two six-digit hex colors: 1 for the same color, 21 for black on white. */
export function contrast(one: string, other: string): number {
  const a = luminance(one);
  const b = luminance(other);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The first candidate that reaches `threshold` against every ground; `last` when none of them does. */
function firstThatReads(candidates: readonly string[], last: string, grounds: readonly string[], threshold: number): string {
  const reads = (candidate: string) => grounds.every((ground) => contrast(candidate, ground) >= threshold);
  return candidates.find(reads) ?? last;
}

/**
 * Telegram's nine colors, with every pair that would be hard to read replaced.
 *
 *   text on bg, text on surface            4.5:1
 *   muted on bg and on surface             4.5:1
 *   link on bg and on surface              4.5:1
 *   on-accent on accent                    4.5:1   (and accent against bg 3:1: a button must show)
 *   border against bg                      3:1
 *   focus against bg                       3:1
 *
 * The page ground and its text are one pair: when Telegram's fail, both come from the design system,
 * and so does the second ground. Each of the others falls back alone, to the design system's color for
 * the scheme; when the theme's ground is so unusual that this color does not reach the threshold on it
 * either, the text color is used, which the first rule has already made readable there.
 *
 * `scheme` is what Telegram says its theme is. Without it the ground's own lightness decides.
 */
export function guardContrast(colors: BaseColors, scheme: Scheme | null = null): BaseColors {
  const design = DESIGN[scheme ?? (luminance(colors["--hb-bg"]) < DARK_BACKGROUND ? "dark" : "light")];

  const ownGround = contrast(colors["--hb-text"], colors["--hb-bg"]) >= AA_TEXT;
  const bg = ownGround ? colors["--hb-bg"] : design["--hb-bg"];
  const text = ownGround ? colors["--hb-text"] : design["--hb-text"];
  // The second ground carries the same text: Telegram's, or else the design system's, or else the first.
  const surface = firstThatReads(
    ownGround ? [colors["--hb-surface"], design["--hb-surface"]] : [design["--hb-surface"]],
    bg,
    [text],
    AA_TEXT,
  );
  const grounds = [bg, surface];

  const muted = firstThatReads([colors["--hb-muted"], design["--hb-muted"]], text, grounds, AA_TEXT);
  const link = firstThatReads([colors["--hb-link"], design["--hb-link"]], text, grounds, AA_TEXT);
  const border = firstThatReads([colors["--hb-border"], design["--hb-border"]], text, [bg], AA_NON_TEXT);
  const focus = firstThatReads([colors["--hb-focus"], design["--hb-focus"]], text, [bg], AA_NON_TEXT);

  // A button: its label on it, and the button itself against the page. The last resort is the page's
  // own text and ground the other way round, which the first rule made readable.
  const buttons: readonly (readonly [accent: string, onAccent: string])[] = [
    [colors["--hb-accent"], colors["--hb-on-accent"]],
    [design["--hb-accent"], design["--hb-on-accent"]],
  ];
  const [accent, onAccent] = buttons.find(
    ([ground, label]) => contrast(label, ground) >= AA_TEXT && contrast(ground, bg) >= AA_NON_TEXT,
  ) ?? [text, bg];

  return {
    "--hb-bg": bg,
    "--hb-surface": surface,
    "--hb-text": text,
    "--hb-muted": muted,
    "--hb-link": link,
    "--hb-accent": accent,
    "--hb-on-accent": onAccent,
    "--hb-border": border,
    "--hb-focus": focus,
  };
}

/** The pairs `guardContrast` promises and a set of colors does not keep (the tests ask). */
export function failingPairs(colors: BaseColors): string[] {
  const pairs: readonly (readonly [BaseToken, BaseToken, number])[] = [
    ["--hb-text", "--hb-bg", AA_TEXT],
    ["--hb-text", "--hb-surface", AA_TEXT],
    ["--hb-muted", "--hb-bg", AA_TEXT],
    ["--hb-muted", "--hb-surface", AA_TEXT],
    ["--hb-link", "--hb-bg", AA_TEXT],
    ["--hb-link", "--hb-surface", AA_TEXT],
    ["--hb-on-accent", "--hb-accent", AA_TEXT],
    ["--hb-accent", "--hb-bg", AA_NON_TEXT],
    ["--hb-border", "--hb-bg", AA_NON_TEXT],
    ["--hb-focus", "--hb-bg", AA_NON_TEXT],
  ];
  return pairs
    .filter(([foreground, background, threshold]) => contrast(colors[foreground], colors[background]) < threshold)
    .map(([foreground, background]) => `${foreground} on ${background}`);
}
