/**
 * The figures the public landing page shows, with the build's overrides applied. The defaults and what
 * they are copied from live in `tariff.ts`; this file only lets a deployment put the page in step with
 * an operator who has changed one of them (REQ-053), and writes the price the way the product writes
 * money everywhere else.
 *
 * `VITE_TRIAL_DAYS` and `VITE_PRICE_UZS` are read at build time. A value that is missing, not a whole
 * number, or outside the range the backend allows falls back to the default, so a mistyped setting can
 * never publish a nonsense figure.
 */
import { formatUzs } from "../shared/money";
import { PRICE_RANGE, PRICE_UZS_DEFAULT, TRIAL_DAYS_DEFAULT, TRIAL_DAYS_RANGE } from "./tariff";

/** A whole number in range from a build-time setting, or the default: a bad setting is not published. */
function whole(raw: unknown, fallback: number, { low, high }: { low: number; high: number }): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) && value >= low && value <= high ? value : fallback;
}

export const TRIAL_DAYS = whole(import.meta.env["VITE_TRIAL_DAYS"], TRIAL_DAYS_DEFAULT, TRIAL_DAYS_RANGE);
export const PRICE_UZS = whole(import.meta.env["VITE_PRICE_UZS"], PRICE_UZS_DEFAULT, PRICE_RANGE);

/** The price as the product writes money everywhere else: whole so'm with thin spaces, 100 000. */
export const PRICE_TEXT = formatUzs(PRICE_UZS);

/**
 * What the catalogs' `{days}` and `{price}` placeholders are filled with. Keeping the numbers out of
 * every catalog is what lets one change here reach all six languages at once.
 */
export function pricingParams(): Readonly<Record<string, string>> {
  return { days: String(TRIAL_DAYS), price: PRICE_TEXT };
}
