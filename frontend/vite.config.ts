import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin, type ResolvedConfig } from "vite";
import { defineConfig } from "vitest/config";

import { collectInitialAssets } from "./scripts/size.ts";
import { BRAND_NAME, BRAND_PLACEHOLDER, BRAND_SOURCE, BRAND_TAGLINE } from "./src/shared/brand.ts";
import { SEO_MARKER, publicOrigin, robotsTxt, seoHead, sitemapXml } from "./src/web/seo.ts";
import { PRICE_RANGE, PRICE_UZS_DEFAULT } from "./src/web/tariff.ts";

/** Where the web panel's service worker is built to: a name that never changes, beside the panel's page. */
export const WORKER_FILE = "panel/sw.js";
/** What the build replaces in the worker's script with this build's list of shell files. */
export const WORKER_MARK = "__HB_PANEL_WORKER_MANIFEST__";
const WORKER_ENTRY = "panel-sw";

/**
 * The worker's list for a build: the panel's page and the scripts and style sheets that page names on
 * first load, and a mark that changes when any of them does (their names carry the hash of their
 * content, and the page names them). Screens loaded on demand are not listed: the worker keeps one
 * when it is first opened.
 */
export function workerManifest(panelHtml: string): { build: string; shell: string[] } {
  const files = collectInitialAssets(panelHtml).local.filter((path) => path.startsWith("/assets/"));
  if (files.length === 0) {
    throw new Error("the panel's page names no built file: is the build output intact?");
  }
  const shell = ["/panel/", ...files.sort()];
  const build = createHash("sha256").update(panelHtml).update("\n").update(shell.join("\n")).digest("hex").slice(0, 16);
  return { build, shell };
}

/** The list as text that is safe between the quotes of a script's string, whichever quotes the minifier chose. */
export function quotedManifest(manifest: { build: string; shell: string[] }): string {
  return JSON.stringify(manifest).replace(/[\\"'`$]/g, "\\$&");
}

/** Writes this build's list of shell files into the built service worker, after everything is on disk. */
function panelWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "hb-panel-worker",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      const worker = bundle[WORKER_FILE];
      if (worker?.type !== "chunk") {
        this.error(`the panel's service worker was not built to ${WORKER_FILE}`);
      }
      // A service worker is one classic script: a part shared with the pages would be an import it
      // cannot make.
      if (worker.imports.length > 0 || worker.dynamicImports.length > 0) {
        this.error(`the panel's service worker must be one file, but it imports ${[...worker.imports, ...worker.dynamicImports].join(", ")}`);
      }
    },
    closeBundle() {
      const path = resolve(outDir, WORKER_FILE);
      const script = readFileSync(path, "utf8");
      if (script.split(WORKER_MARK).length !== 2) {
        this.error(`${WORKER_FILE} must hold the mark ${WORKER_MARK} exactly once`);
      }
      const manifest = workerManifest(readFileSync(resolve(outDir, "panel", "index.html"), "utf8"));
      writeFileSync(path, script.replace(WORKER_MARK, () => quotedManifest(manifest)));
    },
  };
}

/** What a page writes where the line on what the product is belongs. */
export const TAGLINE_PLACEHOLDER = "{tagline}";

const inAttribute = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * A page with the product's name and the line on what it is filled in. The four `index.html` files say
 * `{brand}` in their title and description, as the texts do, and the name is put there when the page is
 * built or served, from the one place it is written (`src/shared/brand.ts`). A page that still holds a
 * brace in its head afterwards names something this function does not know, and the build stops.
 */
export function brandedHtml(html: string): string {
  const filled = html.split(BRAND_PLACEHOLDER).join(inAttribute(BRAND_NAME)).split(TAGLINE_PLACEHOLDER).join(inAttribute(BRAND_TAGLINE));
  const head = /<head>[\s\S]*?<\/head>/.exec(filled.replace(/<!--[\s\S]*?-->/g, ""))?.[0] ?? "";
  const left = /\{\w*\}/.exec(head);
  if (left) {
    throw new Error(`a page's head holds ${left[0]}, which the build does not fill in`);
  }
  return filled;
}

/** Fills the product's name into every page, in the build and in the development server alike. */
function brandPages(): Plugin {
  return {
    name: "hb-brand-pages",
    transformIndexHtml: { order: "pre", handler: brandedHtml },
  };
}

/**
 * The build-time settings the public page's search-engine files are made from: the `.env` files of this
 * directory, and the process environment (a deployment passes `VITE_*` as build arguments).
 */
function buildEnv(config: ResolvedConfig): Record<string, string | undefined> {
  return { ...loadEnv(config.mode, config.root, "VITE_"), ...process.env };
}

/** The price the structured data states, held to the same range and default the page uses (pricing.ts). */
function priceOf(env: Record<string, string | undefined>): number {
  const raw = env["VITE_PRICE_UZS"];
  if (typeof raw !== "string" || raw.trim() === "") {
    return PRICE_UZS_DEFAULT;
  }
  const value = Number(raw.trim());
  return Number.isSafeInteger(value) && value >= PRICE_RANGE.low && value <= PRICE_RANGE.high ? value : PRICE_UZS_DEFAULT;
}

/**
 * The public page's search-engine files (see src/web/seo.ts): the canonical link, the sharing card's
 * address and the structured data go into its head at the marker, and `robots.txt` and `sitemap.xml`
 * are written beside the built entries. The site's own address is never guessed: with no
 * `VITE_PUBLIC_ORIGIN` the canonical link, the sharing image and the sitemap are left out, and the
 * build says so, because a canonical pointing at the wrong host is worse than none.
 */
function webSeo(): Plugin {
  let outDir = "dist";
  let origin: string | null = null;
  let price = PRICE_UZS_DEFAULT;
  return {
    name: "hb-web-seo",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      const env = buildEnv(config);
      origin = publicOrigin(env["VITE_PUBLIC_ORIGIN"]);
      price = priceOf(env);
      if (origin === null) {
        config.logger.warn(
          "hb-web-seo: VITE_PUBLIC_ORIGIN is not set, so the landing page carries no canonical link, no sharing image and no sitemap. Set it to the site's own address (for example https://qarz.example.uz) for a production build.",
        );
      }
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        return html.includes(SEO_MARKER) ? html.replace(SEO_MARKER, () => seoHead(origin, price)) : html;
      },
    },
    closeBundle() {
      writeFileSync(resolve(outDir, "robots.txt"), robotsTxt(origin));
      const sitemap = sitemapXml(origin, new Date().toISOString().slice(0, 10));
      if (sitemap !== null) {
        writeFileSync(resolve(outDir, "sitemap.xml"), sitemap);
      }
    },
  };
}

// One application, four pages and a worker (ADR-011): the staff workspace served to the Telegram Mini
// App, the web panel for desktop, the administration panel, and the page behind a customer's read-only
// link, which shares nothing with the others but the design tokens. The web panel alone can be
// installed; its service worker is built to /panel/sw.js.
export default defineConfig({
  plugins: [react(), brandPages(), panelWorker(), webSeo()],
  // The brand's definition is the one file the pages read from outside this directory; the development
  // server serves nothing else from there.
  server: { fs: { allow: [import.meta.dirname, resolve(import.meta.dirname, "..", BRAND_SOURCE)] } },
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, "app/index.html"),
        panel: resolve(import.meta.dirname, "panel/index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
        k: resolve(import.meta.dirname, "k/index.html"),
        web: resolve(import.meta.dirname, "web/index.html"),
        [WORKER_ENTRY]: resolve(import.meta.dirname, "src/panel/pwa/sw.ts"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === WORKER_ENTRY ? WORKER_FILE : "assets/[name]-[hash].js"),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    // Russian text is at hand in every test file; see the file for why.
    setupFiles: ["scripts/testLanguages.ts"],
  },
});
