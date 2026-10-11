import { expect, goTo, settled, signInOnWeb, test, DESKTOP } from "../support/fixtures.ts";
import { newPerson } from "../support/telegram.ts";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility gate (T-F). Runs axe-core against the panel's real, rendered screens and fails the run
 * on any critical or serious WCAG 2.0/2.1 A/AA violation (contrast, names, roles, ARIA). The deploy
 * changed the palette to indigo and renamed the semantic colour tokens, so this is the check that the
 * new colours still meet contrast and that nothing lost a label or a role in the migration.
 *
 * `expectViolations` is on for this file only: axe injects its own script into the page, which the
 * page's Content-Security-Policy would otherwise count as a violation of the suite's own hardening
 * watch. The hardening watch still runs on its own (06-hardening); here we measure accessibility.
 */
test.use({ expectViolations: true });

test("the panel sign-in screen passes axe-core (wcag2a/aa, critical + serious)", async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto("/panel/");
  await settled(page);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
});

test("authenticated panel screens pass axe-core (wcag2a/aa, critical + serious)", async ({ page, chat }) => {
  test.setTimeout(120_000);
  const owner = newPerson("A11y");
  await chat.openShop(owner, `A11y ${owner.id}`);
  await signInOnWeb(page, owner, "/panel/");

  const screens: ReadonlyArray<{ name: string; route: string }> = [
    { name: "overview", route: "" },
    { name: "customers", route: "/customers" },
    { name: "stock", route: "/stock" },
  ];
  for (const screen of screens) {
    await test.step(`${screen.name} passes axe-core`, async () => {
      if (screen.route) await goTo(page, screen.route);
      await settled(page);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
    });
  }
});
