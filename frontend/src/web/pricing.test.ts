import { describe, expect, it } from "vitest";

import { formatUzs } from "../shared/money";
import { pricingParams, PRICE_TEXT, PRICE_UZS, TRIAL_DAYS } from "./pricing";
import { FREE_PLAN_CUSTOMERS, PRICE_UZS_DEFAULT, TRIAL_DAYS_DEFAULT } from "./tariff";

/**
 * The page's figures are the backend's own defaults (tariff.ts), and the page never states them as a
 * promise: the administrator changes the price and the trial's length at run time (REQ-053). What is
 * checked here is that the page publishes the defaults and not something invented, and that the numbers
 * reach the catalogs as placeholders rather than being written into six catalogs.
 */
describe("the figures the page publishes", () => {
  it("are the backend's defaults when no build setting overrides them", () => {
    expect(TRIAL_DAYS).toBe(TRIAL_DAYS_DEFAULT);
    expect(PRICE_UZS).toBe(PRICE_UZS_DEFAULT);
    expect(TRIAL_DAYS).toBe(30);
    expect(PRICE_UZS).toBe(100_000);
    expect(FREE_PLAN_CUSTOMERS).toBe(30);
  });

  it("write the price the way the product writes money everywhere else", () => {
    expect(PRICE_TEXT).toBe(formatUzs(PRICE_UZS));
    expect(PRICE_TEXT).toBe("100\u00a0000");
  });

  it("reach the catalogs as the {days} and {price} placeholders", () => {
    expect(pricingParams()).toEqual({ days: "30", price: "100\u00a0000" });
  });
});
