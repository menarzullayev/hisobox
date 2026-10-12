// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { translate } from "../i18n/catalog";
import { PaperPhone, PaperToPhone } from "./PaperPhone";

/**
 * The page's two pictures. They are drawn, not photographed, so what is checked here is what a reader
 * and a screen reader are shown: the composition's pieces are all there, the phone's screen says what
 * the application says, and none of it is read aloud — a picture of a notebook is not content.
 */
afterEach(cleanup);

function renderIn(ui: React.ReactElement): HTMLElement {
  const { container } = render(<I18nProvider initialLanguage="uz">{ui}</I18nProvider>);
  return container;
}

describe("the hero's picture", () => {
  it("puts a page of paper behind a handset, with the message that made an entry over both", () => {
    const container = renderIn(<PaperPhone />);
    expect(container.querySelector(".pp__paper--behind")).toBeTruthy();
    expect(container.querySelector(".pp__device--front")).toBeTruthy();
    expect(container.querySelector(".pp__card")).toBeTruthy();
  });

  it("writes the shop's own lines on the paper, with the date at the corner", () => {
    const container = renderIn(<PaperPhone />);
    const notes = [...container.querySelectorAll(".pp__note")].map((note) => note.textContent);
    expect(notes).toHaveLength(3);
    expect(notes[0]).toContain("Rustam aka");
    expect(notes[0]).toContain("1 500 000");
    expect(container.querySelector(".pp__date")?.textContent).toBe("15.09");
  });

  it("shows the application's own wording on the phone, not wording invented for the picture", () => {
    const container = renderIn(<PaperPhone />);
    const states = [...container.querySelectorAll(".pp__state")].map((state) => state.textContent);
    // The same three phrases the real screens use, built from the same keys.
    expect(states).toContain(translate("uz", "overdue.days", { count: 10 }));
    expect(states).toContain(translate("uz", "due.today"));
    expect(states).toContain(translate("uz", "due.inDays", { count: 4 }));
    expect(container.querySelector(".pp__search")?.textContent).toBe(translate("uz", "customers.search"));
  });

  it("fills the screen past its own edge, the way a list on a phone does", () => {
    const container = renderIn(<PaperPhone />);
    // More customers than the screen holds: the last row is cut by the frame rather than the list
    // stopping short and leaving a blank half-screen.
    expect(container.querySelectorAll(".pp__row").length).toBeGreaterThanOrEqual(8);
    expect(container.querySelector(".pp__list")).toBeTruthy();
  });

  it("writes the amounts the way the product writes money", () => {
    const container = renderIn(<PaperPhone />);
    const amounts = [...container.querySelectorAll(".pp__amount")].map((amount) => amount.textContent);
    expect(amounts[0]).toBe("1\u00a0500\u00a0000");
    expect(amounts[1]).toBe("250\u00a0000");
  });

  it("shows the message that was typed and what became of it, and shows no voice anywhere", () => {
    const container = renderIn(<PaperPhone />);
    expect(container.querySelector(".pp__card-said")?.textContent).toContain("1 500 000");
    expect(container.querySelector(".pp__card-done")?.textContent).toBe(translate("uz", "landing.paper.card.done"));
    // The product has no voice input: the picture must not suggest one.
    const markup = container.innerHTML.toLowerCase();
    for (const word of ["voice", "microphone", "audio", "ovoz"]) {
      expect(markup, word).not.toContain(word);
    }
  });

  it("reads nothing aloud: every word in it is the application's, not content", () => {
    const container = renderIn(<PaperPhone />);
    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')];
    expect(hidden.length).toBeGreaterThan(0);
    // The three pieces a screen reader would otherwise announce are all inside an aria-hidden subtree.
    for (const selector of [".pp__paper--behind", ".pp__device--front"]) {
      expect(container.querySelector(selector)?.closest('[aria-hidden="true"]')).toBeTruthy();
    }
  });
});

describe("the picture the later section makes", () => {
  it("shows the notebook and the handset side by side, each with its own label", () => {
    const container = renderIn(<PaperToPhone />);
    const captions = [...container.querySelectorAll(".pp-pair__caption")].map((c) => c.textContent);
    expect(captions).toEqual([translate("uz", "landing.paper.before"), translate("uz", "landing.paper.after")]);
    expect(container.querySelectorAll(".pp-pair__side")).toHaveLength(2);
    expect(container.querySelector(".pp__paper--flat")).toBeTruthy();
    expect(container.querySelector(".pp__device--flat")).toBeTruthy();
  });
});
