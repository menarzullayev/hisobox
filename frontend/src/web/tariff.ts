/**
 * The tariff figures of the product, as the backend defines them. This file imports nothing and reads
 * nothing from the environment, so the build's own configuration (vite.config.ts, the structured data
 * it writes) reads the very same numbers the page shows, and there is one place to change when the
 * backend's defaults change.
 *
 *   trial days            backend/src/qarz/domain/platform_settings.py  ("trial_days", 30; REQ-052)
 *   the monthly price     backend/src/qarz/domain/subscription.py       (DEFAULT_PRICE_UZS = 100_000)
 *   the free plan's size  backend/src/qarz/domain/platform_settings.py  ("free_plan_customers", 30)
 *
 * The administrator changes the price and the trial's length at run time (REQ-053), so the page never
 * states them as a promise: it shows them and says who sets them. A deployment can put the page in step
 * with a changed figure through `VITE_TRIAL_DAYS` and `VITE_PRICE_UZS` (see pricing.ts).
 */

/** How long the trial the backend starts a shop with runs, and the range the backend allows it in. */
export const TRIAL_DAYS_DEFAULT = 30;
export const TRIAL_DAYS_RANGE = { low: 1, high: 365 } as const;

/** The monthly price in whole so'm, and the range the backend allows it in. */
export const PRICE_UZS_DEFAULT = 100_000;
export const PRICE_RANGE = { low: 1_000, high: 10_000_000 } as const;

/** How many customers the free plan holds, when the administrator has switched it on (off by default). */
export const FREE_PLAN_CUSTOMERS = 30;
