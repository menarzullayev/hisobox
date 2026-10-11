import { expect, goTo, settled, signInOnWeb, test, DESKTOP } from "../support/fixtures.ts";
import { newPerson } from "../support/telegram.ts";

/**
 * Visual regression gate (T-G). Captures full-page screenshots of the panel's key screens and compares
 * them to the committed baselines. The first run writes the baselines with
 * `npx playwright test --update-snapshots`; afterwards CI fails on any unintended visual change — which
 * is exactly what guards the indigo rebrand against a stray colour or layout slip.
 *
 * `expectViolations` is on here too: a screenshot compares pixels, not policy, and the hardening watch
 * is covered elsewhere.
 */
test.use({ expectViolations: true });

test("authenticated panel screens match the visual baseline", async ({ page, chat }) => {
  test.setTimeout(120_000);
  const owner = newPerson("Visual");
  await chat.openShop(owner, `Visual ${owner.id}`);
  await signInOnWeb(page, owner, "/panel/");

  const screens: ReadonlyArray<{ name: string; route: string }> = [
    { name: "overview", route: "" },
    { name: "customers", route: "/customers" },
    { name: "stock", route: "/stock" },
  ];
  for (const screen of screens) {
    await test.step(`${screen.name} matches the baseline`, async () => {
      if (screen.route) await goTo(page, screen.route);
      await settled(page);
      await expect(page).toHaveScreenshot(`${screen.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
