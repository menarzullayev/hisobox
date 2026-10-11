import { useI18n } from "../i18n/I18nProvider";
import { LANGUAGES, type Language, type MessageKey } from "../i18n/types";
import { BRAND_NAME } from "../shared/brand";
import { BOT_USERNAME } from "../shared/settings";

const FEATURES = ["customers", "stock", "reports", "reminders", "staff", "payments"] as const;
const STEPS = ["1", "2", "3"] as const;

export function Landing() {
  const { t, language, setLanguage } = useI18n();
  const telegramHref = BOT_USERNAME ? `https://t.me/${BOT_USERNAME}` : "/panel/";

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            {BRAND_NAME.charAt(0)}
          </span>
          <span className="brand-name">{BRAND_NAME}</span>
        </span>
        <span className="header-spacer" />
        <label className="lang-field">
          <span className="visually-hidden">{t("shell.language")}</span>
          <select
            className="lang-select"
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
        <a className="header-link" href="/panel/">
          {t("landing.cta.panel")}
        </a>
      </header>

      <main className="landing-main">
        <section className="hero">
          <h1>{t("landing.hero.title")}</h1>
          <p>{t("landing.hero.body")}</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/panel/">
              {t("landing.cta.panel")}
            </a>
            <a className="btn btn-secondary" href={telegramHref}>
              {t("landing.cta.telegram")}
            </a>
          </div>
          <a className="staff-link" href="/panel/">
            {t("landing.cta.staff")}
          </a>
        </section>

        <section className="section">
          <h2>{t("landing.features.title")}</h2>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="card" key={feature}>
                <h3>{t(("landing.feature." + feature) as MessageKey)}</h3>
                <p>{t(("landing.feature." + feature + ".text") as MessageKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>{t("landing.how.title")}</h2>
          <div className="steps">
            {STEPS.map((step) => (
              <article className="step" key={step}>
                <span className="step-num" aria-hidden="true">
                  {step}
                </span>
                <h3>{t(("landing.how." + step + ".title") as MessageKey)}</h3>
                <p>{t(("landing.how." + step + ".text") as MessageKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section who">
          <h2>{t("landing.who.title")}</h2>
          <p>{t("landing.who.text")}</p>
        </section>
      </main>

      <footer className="landing-footer">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            {BRAND_NAME.charAt(0)}
          </span>
          <span>
            <strong className="brand-name">{BRAND_NAME}</strong>
            <span className="footer-tagline"> — {t("landing.footer.tagline")}</span>
          </span>
        </span>
        <nav className="footer-links" aria-label={t("shell.mainNav")}>
          <a href="/panel/">{t("landing.footer.panel")}</a>
        </nav>
        <span className="footer-rights">{t("landing.footer.rights")}</span>
      </footer>
    </div>
  );
}
