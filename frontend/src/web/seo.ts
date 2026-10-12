/**
 * What a search engine and a person sharing the link are told, built from the one definition of the
 * product's name and from the site's own address.
 *
 * The address is the one thing the repository cannot know: a deployment is `qarz.<your domain>`, chosen
 * when the server is set up (deploy/production/SINGLE-HOST.md, DEPLOY_PUBLIC_HOST). So the build is told
 * it through `VITE_PUBLIC_ORIGIN`, and when it is not told, the page carries no canonical link and no
 * sharing image rather than a guessed host — a canonical pointing at the wrong address is worse than
 * none. `robots.txt` is written either way; only its `Sitemap` line needs the address.
 *
 * These are pure functions so that `vite.config.ts` can call them and a test can check them without a
 * build. Nothing here is fetched at run time.
 */
import { BRAND_NAME, BRAND_TAGLINE } from "../shared/brand";

/** Where the plugin puts the head tags that need the site's address, in web/index.html. */
export const SEO_MARKER = "<!--seo:origin-->";

/** The sharing card's image: the brand's 1200x630 card, beside the icons the build makes. */
const CARD_IMAGE = "/panel/icons/og-share.png";

/**
 * The site's own address from a build-time setting, or null. Only an absolute http(s) address with a
 * host is accepted: a bare host, a path or a protocol-relative value is not a place to send a crawler.
 */
export function publicOrigin(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/?#]+(?:\/[^\s?#]*)?$/i.test(value) ? value : null;
}

/** The landing page's own address, or null when the build was not told one. */
export function landingUrl(origin: string | null): string | null {
  return origin === null ? null : `${origin}/web/`;
}

/**
 * The structured data: who makes the product, the site itself, and the application with the price the
 * page shows. Written as one `@graph` so a crawler reads three things from one block. The price is the
 * same number the page prints (tariff.ts); the address and the logo are left out when the build was not
 * told the site's own address.
 */
export function structuredData(origin: string | null, priceUzs: number): Record<string, unknown> {
  const page = landingUrl(origin);
  const organization: Record<string, unknown> = {
    "@type": "Organization",
    name: BRAND_NAME,
    description: BRAND_TAGLINE,
  };
  const site: Record<string, unknown> = {
    "@type": "WebSite",
    name: BRAND_NAME,
    inLanguage: "uz",
  };
  const application: Record<string, unknown> = {
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: BRAND_TAGLINE,
    offers: { "@type": "Offer", price: String(priceUzs), priceCurrency: "UZS" },
  };
  if (page !== null && origin !== null) {
    organization["url"] = page;
    organization["logo"] = `${origin}${CARD_IMAGE}`;
    site["url"] = page;
  }
  return { "@context": "https://schema.org", "@graph": [organization, site, application] };
}

/**
 * What takes the marker's place in the page's head: the canonical link, the sharing card's address and
 * image, and the structured data. With no address, only the structured data is there.
 */
export function seoHead(origin: string | null, priceUzs: number): string {
  const lines = [`<script type="application/ld+json">${JSON.stringify(structuredData(origin, priceUzs))}</script>`];
  const page = landingUrl(origin);
  if (page !== null && origin !== null) {
    lines.unshift(
      `<link rel="canonical" href="${page}" />`,
      `<meta property="og:url" content="${page}" />`,
      `<meta property="og:image" content="${origin}${CARD_IMAGE}" />`,
      `<meta property="og:image:alt" content="${BRAND_NAME}" />`,
      `<meta name="twitter:image" content="${origin}${CARD_IMAGE}" />`,
    );
  }
  return lines.join("\n    ");
}

/** The paths a crawler is asked to leave alone: the application's own entries and the API. */
const CLOSED_PATHS = ["/app/", "/panel/", "/admin/", "/k/", "/api/", "/files/", "/pay/", "/tg/"];

/**
 * `robots.txt`. The public page may be crawled; the application's entries and the API may not. The
 * `Sitemap` line is written only when the address is known, because it must be absolute.
 */
export function robotsTxt(origin: string | null): string {
  const lines = ["User-agent: *", "Allow: /", ...CLOSED_PATHS.map((path) => `Disallow: ${path}`)];
  const page = landingUrl(origin);
  if (page !== null) {
    lines.push("", `Sitemap: ${page.replace(/\/$/, "")}/sitemap.xml`);
  }
  return `${lines.join("\n")}\n`;
}

/** `sitemap.xml` for the one public page, or null when the address is not known. */
export function sitemapXml(origin: string | null, lastmod: string): string | null {
  const page = landingUrl(origin);
  if (page === null) {
    return null;
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${page}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}
