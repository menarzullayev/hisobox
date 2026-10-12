import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { detectLanguage, readStoredLanguage } from "../i18n/detect";
import { startLanguage } from "../i18n/start";
import { I18nProvider } from "../i18n/I18nProvider";
import { initTheme } from "../shared/theme";
import { Landing } from "./Landing";
import "../shared/tokens.css";
import "./landing.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("root element is missing");
}

initTheme();
const initialLanguage = detectLanguage({ stored: readStoredLanguage() });

void startLanguage(initialLanguage).then(() => {
  createRoot(root).render(
    <StrictMode>
      <I18nProvider initialLanguage={initialLanguage}>
        <Landing />
      </I18nProvider>
    </StrictMode>,
  );
});
