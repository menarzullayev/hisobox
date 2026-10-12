/**
 * The public landing page, served at /web/ (the proxy sends `/` here). It is the one page of the product
 * that a person who has never heard of it reads first, so it carries the whole story in order: what the
 * product is, what it does, what it looks like, how it is started, what it is worth, how the data is
 * kept, what it costs, the questions people ask, and one last way in.
 *
 * Three rules the page holds to, and why:
 *   - Nothing is claimed that the product does not do. The six feature areas, the trial's length and the
 *     price come from the product's own definitions (src/web/pricing.ts, tariff.ts), and the page says in
 *     words who sets the price, because the administrator changes it (REQ-053).
 *   - The reader's attention is not taken hostage. Everything moves only when asked, the workspace is
 *     fetched after the copy, and `prefers-reduced-motion` stops the motion rather than the content.
 *   - The picture is never the only way in. Every screen in the workspace is a real button, the product
 *     tour is a real tab list, the questions are real `<details>`, and every call to action is a link
 *     that works with the keyboard alone.
 */
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";
import { LANGUAGES, type Language, type MessageKey } from "../i18n/types";
import { BRAND_NAME } from "../shared/brand";
import { BOT_USERNAME } from "../shared/settings";
import { start as startAnalytics, track } from "./analytics";
import { pricingParams } from "./pricing";

/** The workspace is a chunk of its own: the headline and the calls to action are on screen before it. */
const Workspace = lazy(() => import("./Workspace3D"));

/** Where the product is entered. The panel signs a person in with Telegram; there is no other door. */
const START_HREF = "/panel/";
/** The figures the catalogs' placeholders are filled with, read once: they are build-time constants. */
const PRICING = pricingParams();

/** The six feature areas, in the order the page argues them: the debt first, the money, then the rest. */
const FEATURES = [
  { id: "ledger", title: "landing.feature.ledger", text: "landing.feature.ledger.text" },
  { id: "cash", title: "landing.feature.cash", text: "landing.feature.cash.text" },
  { id: "stock", title: "landing.feature.stock", text: "landing.feature.stock.text" },
  { id: "reports", title: "landing.feature.reports", text: "landing.feature.reports.text" },
  { id: "customers", title: "landing.feature.customers", text: "landing.feature.customers.text" },
  { id: "staff", title: "landing.feature.staff", text: "landing.feature.staff.text" },
] as const satisfies readonly { id: string; title: MessageKey; text: MessageKey }[];

/** The screens of the product tour. Each is a tab, and each tab draws a small stand-in of the screen. */
const SCREENS = [
  { id: "customers", label: "landing.showcase.tab.customers" },
  { id: "ledger", label: "landing.showcase.tab.ledger" },
  { id: "cash", label: "landing.showcase.tab.cash" },
  { id: "stock", label: "landing.showcase.tab.stock" },
  { id: "reports", label: "landing.showcase.tab.reports" },
  { id: "staff", label: "landing.showcase.tab.staff" },
] as const satisfies readonly { id: string; label: MessageKey }[];

const STEPS = [
  { id: "1", title: "landing.how.1.title", text: "landing.how.1.text" },
  { id: "2", title: "landing.how.2.title", text: "landing.how.2.text" },
  { id: "3", title: "landing.how.3.title", text: "landing.how.3.text" },
] as const satisfies readonly { id: string; title: MessageKey; text: MessageKey }[];

const BENEFITS = [
  { id: "control", title: "landing.benefit.control", text: "landing.benefit.control.text" },
  { id: "time", title: "landing.benefit.time", text: "landing.benefit.time.text" },
  { id: "losses", title: "landing.benefit.losses", text: "landing.benefit.losses.text" },
  { id: "team", title: "landing.benefit.team", text: "landing.benefit.team.text" },
  { id: "anywhere", title: "landing.benefit.anywhere", text: "landing.benefit.anywhere.text" },
  { id: "decisions", title: "landing.benefit.decisions", text: "landing.benefit.decisions.text" },
] as const satisfies readonly { id: string; title: MessageKey; text: MessageKey }[];

const TRUST = [
  { id: "isolation", title: "landing.trust.isolation", text: "landing.trust.isolation.text" },
  { id: "roles", title: "landing.trust.roles", text: "landing.trust.roles.text" },
  { id: "telegram", title: "landing.trust.telegram", text: "landing.trust.telegram.text" },
  { id: "backup", title: "landing.trust.backup", text: "landing.trust.backup.text" },
  { id: "export", title: "landing.trust.export", text: "landing.trust.export.text" },
  { id: "access", title: "landing.trust.access", text: "landing.trust.access.text" },
] as const satisfies readonly { id: string; title: MessageKey; text: MessageKey }[];

const TRIAL_POINTS = [
  "landing.pricing.trial.point1",
  "landing.pricing.trial.point2",
  "landing.pricing.trial.point3",
] as const satisfies readonly MessageKey[];

const PAID_POINTS = [
  "landing.pricing.paid.point1",
  "landing.pricing.paid.point2",
  "landing.pricing.paid.point3",
  "landing.pricing.paid.point4",
] as const satisfies readonly MessageKey[];

const QUESTIONS = [
  { q: "landing.faq.q1", a: "landing.faq.a1" },
  { q: "landing.faq.q2", a: "landing.faq.a2" },
  { q: "landing.faq.q3", a: "landing.faq.a3" },
  { q: "landing.faq.q4", a: "landing.faq.a4" },
  { q: "landing.faq.q5", a: "landing.faq.a5" },
  { q: "landing.faq.q6", a: "landing.faq.a6" },
  { q: "landing.faq.q7", a: "landing.faq.a7" },
  { q: "landing.faq.q8", a: "landing.faq.a8" },
] as const satisfies readonly { q: MessageKey; a: MessageKey }[];

/** The sections the header links to and the page reports as read. */
const SECTIONS = [
  { id: "funksiyalar", label: "landing.nav.features" },
  { id: "mahsulot", label: "landing.nav.showcase" },
  { id: "qanday", label: "landing.nav.how" },
  { id: "foydalar", label: "landing.nav.benefits" },
  { id: "ishonch", label: "landing.nav.trust" },
  { id: "tariflar", label: "landing.nav.pricing" },
  { id: "savollar", label: "landing.nav.faq" },
] as const satisfies readonly { id: string; label: MessageKey }[];

/** A small pill above a section's title, the page's repeated rhythm. */
function Eyebrow({ text }: { text: string }) {
  return <p className="eyebrow">{text}</p>;
}

/** The way into the product. One link, used in five places, so it is written once. */
function StartLink({ id, className, children }: { id: string; className: string; children: string }) {
  return (
    <a
      className={className}
      href={START_HREF}
      onClick={() => {
        track("cta_click", { id, target: "panel" });
        track("app_navigate", { id, target: "panel" });
        if (id.startsWith("final")) {
          track("conversion", { id });
        }
      }}
    >
      {children}
    </a>
  );
}

/**
 * One screen of the tour, drawn from the design tokens: the shape of the real screen with the figures
 * left out. No customer's name is invented — the badge above says what the reader is looking at.
 */
function Screen({ id }: { id: string }) {
  if (id === "reports") {
    return (
      <div className="mock mock--chart" aria-hidden="true">
        {[62, 40, 78, 52, 88, 70].map((height, index) => (
          <span className="mock__bar" key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    );
  }
  if (id === "cash") {
    return (
      <div className="mock mock--cash" aria-hidden="true">
        <span className="mock__figure mock__figure--in" />
        <span className="mock__figure mock__figure--out" />
        <span className="mock__line" />
        <span className="mock__line mock__line--short" />
      </div>
    );
  }
  return (
    <div className="mock" aria-hidden="true">
      {[0, 1, 2, 3].map((row) => (
        <span className="mock__row" key={row}>
          <span className="mock__name" />
          <span className={id === "ledger" ? "mock__badge" : "mock__amount"} />
        </span>
      ))}
    </div>
  );
}

/** The product tour: a tab list and, under it, a stand-in of the screen the chosen tab names. */
function Showcase() {
  const { t } = useI18n();
  const [chosen, setChosen] = useState<string>(SCREENS[0].id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  // Left/Right and Home/End move along the list, as a tab list is expected to; Tab leaves it.
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const at = SCREENS.findIndex((screen) => screen.id === chosen);
      const last = SCREENS.length - 1;
      const move =
        event.key === "ArrowRight"
          ? (at + 1) % SCREENS.length
          : event.key === "ArrowLeft"
            ? (at - 1 + SCREENS.length) % SCREENS.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? last
                : -1;
      const next = move < 0 ? undefined : SCREENS[move];
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      setChosen(next.id);
      tabs.current[move]?.focus();
      track("section_view", { id: `showcase_${next.id}` });
    },
    [chosen],
  );

  return (
    <div className="tour">
      <div className="tour__tabs" role="tablist" aria-label={t("landing.showcase.title")}>
        {SCREENS.map((screen, index) => (
          <button
            key={screen.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tour-tab-${screen.id}`}
            aria-selected={chosen === screen.id}
            aria-controls={`tour-panel-${screen.id}`}
            tabIndex={chosen === screen.id ? 0 : -1}
            className="tour__tab"
            onKeyDown={onKeyDown}
            onClick={() => {
              setChosen(screen.id);
              track("section_view", { id: `showcase_${screen.id}` });
            }}
          >
            {t(screen.label)}
          </button>
        ))}
      </div>
      <div
        className="tour__screen"
        role="tabpanel"
        id={`tour-panel-${chosen}`}
        aria-labelledby={`tour-tab-${chosen}`}
        tabIndex={0}
      >
        <p className="tour__badge">{t("landing.showcase.demo")}</p>
        <Screen id={chosen} />
      </div>
    </div>
  );
}

/** What stands in for the workspace while its chunk is on the way: the same box, quietly. */
function WorkspaceSkeleton() {
  const { t } = useI18n();
  return (
    <div className="ws-skeleton" role="status">
      <span className="visually-hidden">{t("landing.workspace.loading")}</span>
      <span className="ws-skeleton__board" aria-hidden="true" />
      <span className="ws-skeleton__panel ws-skeleton__panel--a" aria-hidden="true" />
      <span className="ws-skeleton__panel ws-skeleton__panel--b" aria-hidden="true" />
      <span className="ws-skeleton__panel ws-skeleton__panel--c" aria-hidden="true" />
    </div>
  );
}

/** The header: the name, the way around the page, the language, and the way in. */
function Header() {
  const { t, language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const telegramHref = BOT_USERNAME === null ? null : `https://t.me/${BOT_USERNAME}`;

  return (
    <header className="hdr">
      <div className="hdr__inner">
        <a className="hdr__brand" href="#bosh">
          <span className="hdr__mark" aria-hidden="true">
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="hdr__name">{BRAND_NAME}</span>
        </a>

        <button
          type="button"
          className="hdr__toggle"
          aria-expanded={open}
          aria-controls="landing-nav"
          onClick={() => setOpen((was) => !was)}
        >
          <span className="visually-hidden">{open ? t("landing.nav.close") : t("landing.nav.menu")}</span>
          <span className="hdr__bars" aria-hidden="true" />
        </button>

        <nav
          id="landing-nav"
          className="hdr__nav"
          aria-label={t("landing.nav.label")}
          data-open={open ? "true" : undefined}
        >
          {SECTIONS.map((section) => (
            <a key={section.id} className="hdr__link" href={`#${section.id}`} onClick={() => setOpen(false)}>
              {t(section.label)}
            </a>
          ))}
        </nav>

        <div className="hdr__tools">
          <label className="hdr__lang">
            <span className="visually-hidden">{t("shell.language")}</span>
            <select
              className="hdr__select"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              {LANGUAGES.map((option) => (
                <option key={option} value={option}>
                  {t(("lang." + option) as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          {telegramHref === null ? null : (
            <a
              className="hdr__telegram"
              href={telegramHref}
              onClick={() => track("app_navigate", { id: "header_telegram", target: "telegram" })}
            >
              {t("landing.hero.trust.telegram")}
            </a>
          )}
          <StartLink id="header_start" className="btn btn--primary btn--small">
            {t("landing.cta.start")}
          </StartLink>
        </div>
      </div>
    </header>
  );
}

export function Landing() {
  const { t } = useI18n();
  const main = useRef<HTMLElement | null>(null);

  // One send per visit rather than one per click: the queue leaves when the page is hidden or unloaded.
  useEffect(() => startAnalytics(), []);

  // Which sections were actually read. Reported once each, and never about the reader.
  useEffect(() => {
    const element = main.current;
    if (element === null || typeof IntersectionObserver !== "function") {
      return;
    }
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-section");
          if (id === null || !entry.isIntersecting || seen.has(id)) {
            continue;
          }
          seen.add(id);
          track("section_view", { id });
        }
      },
      { threshold: 0.35 },
    );
    for (const node of element.querySelectorAll("[data-section]")) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page">
      <a className="skip" href="#main">
        {t("landing.skip")}
      </a>
      <Header />

      <main className="main" id="main" ref={main}>
        {/* 1 — the hero: the promise on the left, the product itself on the right. */}
        <section className="hero" id="bosh">
          <div className="hero__copy">
            <Eyebrow text={t("landing.hero.eyebrow")} />
            <h1 className="hero__title">
              <span className="hero__line">{t("landing.hero.title1")}</span>
              <span className="hero__line hero__line--accent">{t("landing.hero.title2")}</span>
            </h1>
            <p className="hero__body">{t("landing.hero.body")}</p>
            <div className="hero__actions">
              <StartLink id="hero_start" className="btn btn--primary btn--large">
                {t("landing.cta.start")}
              </StartLink>
              <a
                className="btn btn--ghost btn--large"
                href="#funksiyalar"
                onClick={() => track("cta_click", { id: "hero_explore", target: "funksiyalar" })}
              >
                {t("landing.cta.explore")}
              </a>
            </div>
            <p className="hero__promise">{t("landing.hero.promise")}</p>
            <ul className="hero__trust">
              <li>{t("landing.hero.trust.languages", { count: LANGUAGES.length })}</li>
              <li>{t("landing.hero.trust.telegram")}</li>
              <li>{t("landing.hero.trust.cloud")}</li>
            </ul>
          </div>
          <div className="hero__stage">
            <Suspense fallback={<WorkspaceSkeleton />}>
              <Workspace />
            </Suspense>
          </div>
        </section>

        {/* 2 — what the product does, one card per area. */}
        <section className="band" id="funksiyalar" data-section="funksiyalar" aria-labelledby="funksiyalar-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.features")} />
            <h2 id="funksiyalar-title">{t("landing.features.title")}</h2>
            <p className="band__lead">{t("landing.features.lead")}</p>
          </div>
          <div className="grid grid--three">
            {FEATURES.map((feature) => (
              <article className="card" key={feature.id}>
                <h3 className="card__title">{t(feature.title)}</h3>
                <p className="card__text">{t(feature.text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 3 — the product tour. */}
        <section className="band" id="mahsulot" data-section="mahsulot" aria-labelledby="mahsulot-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.showcase")} />
            <h2 id="mahsulot-title">{t("landing.showcase.title")}</h2>
            <p className="band__lead">{t("landing.showcase.lead")}</p>
          </div>
          <Showcase />
        </section>

        {/* 4 — how it is started. */}
        <section className="band" id="qanday" data-section="qanday" aria-labelledby="qanday-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.how")} />
            <h2 id="qanday-title">{t("landing.how.title")}</h2>
            <p className="band__lead">{t("landing.how.lead")}</p>
          </div>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li className="step" key={step.id}>
                <span className="step__num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="step__title">{t(step.title)}</h3>
                <p className="step__text">{t(step.text)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 5 — what it is worth to the business. */}
        <section className="band" id="foydalar" data-section="foydalar" aria-labelledby="foydalar-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.benefits")} />
            <h2 id="foydalar-title">{t("landing.benefits.title")}</h2>
            <p className="band__lead">{t("landing.benefits.lead")}</p>
          </div>
          <div className="grid grid--three">
            {BENEFITS.map((benefit) => (
              <article className="card card--plain" key={benefit.id}>
                <h3 className="card__title">{t(benefit.title)}</h3>
                <p className="card__text">{t(benefit.text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 6 — how the data is kept. */}
        <section className="band band--deep" id="ishonch" data-section="ishonch" aria-labelledby="ishonch-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.trust")} />
            <h2 id="ishonch-title">{t("landing.trust.title")}</h2>
            <p className="band__lead">{t("landing.trust.lead")}</p>
          </div>
          <div className="grid grid--three">
            {TRUST.map((item) => (
              <article className="card" key={item.id}>
                <h3 className="card__title">{t(item.title)}</h3>
                <p className="card__text">{t(item.text)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 7 — what it costs. The numbers come from the product's own definitions, never from this page. */}
        <section className="band" id="tariflar" data-section="tariflar" aria-labelledby="tariflar-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.pricing")} />
            <h2 id="tariflar-title">{t("landing.pricing.title")}</h2>
            <p className="band__lead">{t("landing.pricing.lead", PRICING)}</p>
          </div>
          <div className="plans">
            <article className="plan">
              <h3 className="plan__name">{t("landing.pricing.trial.name")}</h3>
              <p className="plan__price">{t("landing.pricing.trial.price")}</p>
              <p className="plan__period">{t("landing.pricing.trial.period", PRICING)}</p>
              <ul className="plan__points">
                {TRIAL_POINTS.map((point) => (
                  <li key={point}>{t(point)}</li>
                ))}
              </ul>
              <StartLink id="pricing_trial" className="btn btn--ghost btn--block">
                {t("landing.pricing.cta")}
              </StartLink>
            </article>
            <article className="plan plan--featured">
              <p className="plan__badge">{t("landing.pricing.badge")}</p>
              <h3 className="plan__name">{t("landing.pricing.paid.name")}</h3>
              <p className="plan__price">{t("landing.pricing.paid.price", PRICING)}</p>
              <p className="plan__period">{t("landing.pricing.paid.period")}</p>
              <ul className="plan__points">
                {PAID_POINTS.map((point) => (
                  <li key={point}>{t(point)}</li>
                ))}
              </ul>
              <StartLink id="pricing_paid" className="btn btn--primary btn--block">
                {t("landing.pricing.cta")}
              </StartLink>
            </article>
          </div>
          <p className="plans__note">{t("landing.pricing.note")}</p>
        </section>

        {/* 8 — the questions people ask. Native disclosures: they work without a line of script. */}
        <section className="band" id="savollar" data-section="savollar" aria-labelledby="savollar-title">
          <div className="band__head">
            <Eyebrow text={t("landing.nav.faq")} />
            <h2 id="savollar-title">{t("landing.faq.title")}</h2>
          </div>
          <div className="faq">
            {QUESTIONS.map((question) => (
              <details className="faq__item" key={question.q}>
                <summary className="faq__question">{t(question.q)}</summary>
                <p className="faq__answer">{t(question.a, PRICING)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 9 — one last way in. */}
        <section className="final" data-section="final" aria-labelledby="final-title">
          <h2 id="final-title">{t("landing.final.title")}</h2>
          <p className="final__body">{t("landing.final.body")}</p>
          <StartLink id="final_start" className="btn btn--primary btn--large">
            {t("landing.final.start")}
          </StartLink>
        </section>
      </main>

      <footer className="foot">
        <div className="foot__brand">
          <span className="hdr__mark" aria-hidden="true">
            {BRAND_NAME.charAt(0)}
          </span>
          <span>
            <strong className="hdr__name">{BRAND_NAME}</strong>
            <span className="foot__tagline"> — {t("landing.footer.tagline")}</span>
          </span>
        </div>
        <nav className="foot__nav" aria-label={t("landing.footer.sections")}>
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {t(section.label)}
            </a>
          ))}
        </nav>
        <div className="foot__nav">
          <a href={START_HREF}>{t("landing.footer.panel")}</a>
        </div>
        <p className="foot__rights">{t("landing.footer.rights")}</p>
      </footer>
    </div>
  );
}
