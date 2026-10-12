// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { LANGUAGES } from "../i18n/types";
import { Landing } from "./Landing";
import { PRICE_TEXT, TRIAL_DAYS } from "./pricing";

/**
 * The public page. What is checked here is what a reader and a crawler are promised: the sections are
 * all there and in order, both calls to action lead where they say they do, the six feature areas are
 * named, the questions are real disclosures, and the figures the page prints are the product's own.
 */
afterEach(cleanup);

function renderPage(): HTMLElement {
  const { container } = render(
    <I18nProvider initialLanguage="uz">
      <Landing />
    </I18nProvider>,
  );
  return container;
}

/** The sections the page must carry, in the order they are read. */
const SECTION_IDS = [
  "bosh",
  "daftar",
  "funksiyalar",
  "mahsulot",
  "qanday",
  "foydalar",
  "ishonch",
  "tariflar",
  "savollar",
] as const;

describe("the landing page", () => {
  it("opens with the headline, the promise and both calls to action", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toContain("Tartibli hisob.");
    expect(heading.textContent).toContain("Oqilona qarorlar.");
    expect(screen.getByText("Biznesingiz — to'liq nazoratda.")).toBeTruthy();

    const start = screen.getAllByRole("link", { name: "Bepul boshlash" });
    expect(start.length).toBeGreaterThan(1);
    for (const link of start) {
      expect(link.getAttribute("href")).toBe("/panel/");
    }
    expect(screen.getByRole("link", { name: "Imkoniyatlarni ko'rish" }).getAttribute("href")).toBe("#funksiyalar");
  });

  it("offers a skip link, so a keyboard reader can pass the header", () => {
    const container = renderPage();
    const skip = container.querySelector(".skip");
    expect(skip?.getAttribute("href")).toBe("#main");
    expect(container.querySelector("#main")).toBeTruthy();
  });

  it("carries every section, each one reachable from the header", () => {
    const container = renderPage();
    for (const id of SECTION_IDS) {
      expect(container.querySelector(`#${id}`), id).toBeTruthy();
    }
    const nav = container.querySelector("#landing-nav");
    expect(nav).toBeTruthy();
    expect(within(nav as HTMLElement).getAllByRole("link")).toHaveLength(7);
  });

  it("opens on the notebook and the phone, and keeps the workspace for the product's own section", () => {
    const container = renderPage();
    // The hero's picture: the shop's paper, the handset, and the message that made an entry.
    const hero = container.querySelector("#bosh");
    expect(hero?.querySelector(".pp__paper--behind")).toBeTruthy();
    expect(hero?.querySelector(".pp__device--front")).toBeTruthy();
    expect(hero?.querySelector(".pp__card")).toBeTruthy();
    // The workspace is not in the hero any more; it is the product section's own picture.
    expect(hero?.querySelector(".ws")).toBeNull();
    const product = container.querySelector("#mahsulot");
    expect(product?.querySelector(".band__stage")).toBeTruthy();
    // And the notebook-turned-application pair stands in its own section, labelled as demonstration.
    const notebook = container.querySelector("#daftar");
    expect(notebook?.querySelectorAll(".pp-pair__side")).toHaveLength(2);
    expect(within(notebook as HTMLElement).getByText("Namoyish ma'lumotlari")).toBeTruthy();
  });

  it("names the six feature areas the product has", () => {
    const container = renderPage();
    const features = container.querySelector("#funksiyalar");
    expect(features).toBeTruthy();
    expect(within(features as HTMLElement).getAllByRole("article")).toHaveLength(6);
    for (const title of [
      "Qarzlar daftari",
      "Kassa va pul oqimi",
      "Tovarlar va ombor",
      "Hisobotlar va statistika",
      "Mijozlar boshqaruvi",
      "Xodimlar va rollar",
    ]) {
      expect(within(features as HTMLElement).getByRole("heading", { name: title, level: 3 }), title).toBeTruthy();
    }
  });

  it("shows the product as a real tab list, and marks what it draws as demonstration", () => {
    const container = renderPage();
    const tour = container.querySelector("#mahsulot");
    expect(tour).toBeTruthy();
    const tabs = within(tour as HTMLElement).getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    expect(within(tour as HTMLElement).getByRole("tabpanel")).toBeTruthy();
    expect(within(tour as HTMLElement).getByText("Namoyish ma'lumotlari")).toBeTruthy();
  });

  it("asks the eight questions as native disclosures, closed until the reader opens one", () => {
    const container = renderPage();
    const faq = container.querySelector("#savollar");
    expect(faq).toBeTruthy();
    const items = (faq as HTMLElement).querySelectorAll("details");
    expect(items).toHaveLength(8);
    expect([...items].every((item) => !item.hasAttribute("open"))).toBe(true);
  });

  it("prints the product's own figures for the trial and the price, never a number written into the page", () => {
    const container = renderPage();
    const plans = container.querySelector("#tariflar");
    expect(plans).toBeTruthy();
    expect(within(plans as HTMLElement).getByText(`${TRIAL_DAYS} kun`)).toBeTruthy();
    // The price is written with the thin space the product writes money with; the reader's text is
    // matched after the usual whitespace normalisation, so the two are compared as a person sees them.
    const shown = PRICE_TEXT.replace(/\s/g, " ");
    expect(within(plans as HTMLElement).getByText(`${shown} so'm`)).toBeTruthy();
    // The price is the administrator's to change, and the page says so rather than promising it.
    expect(within(plans as HTMLElement).getByText(/administratori tomonidan belgilanadi/)).toBeTruthy();
  });

  it("offers the interface's languages, and counts them the same way the interface does", () => {
    const container = renderPage();
    const select = container.querySelector(".hdr__select");
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).options).toHaveLength(LANGUAGES.length);
    expect(screen.getByText(`${LANGUAGES.length} tilda`)).toBeTruthy();
  });

  it("ends with the last call to action, which is the conversion the page is for", () => {
    const container = renderPage();
    const final = container.querySelector(".final");
    expect(final).toBeTruthy();
    const link = within(final as HTMLElement).getByRole("link", { name: "Bepul boshlash" });
    expect(link.getAttribute("href")).toBe("/panel/");
  });
});
