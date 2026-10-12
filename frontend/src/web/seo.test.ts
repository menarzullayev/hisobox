import { describe, expect, it } from "vitest";

import { BRAND_NAME } from "../shared/brand";
import { PRICE_UZS_DEFAULT } from "./tariff";
import { landingUrl, publicOrigin, robotsTxt, seoHead, sitemapXml, structuredData } from "./seo";

describe("the site's own address", () => {
  it("takes an absolute http(s) address, with or without a trailing slash", () => {
    expect(publicOrigin("https://qarz.example.uz")).toBe("https://qarz.example.uz");
    expect(publicOrigin("  https://qarz.example.uz/  ")).toBe("https://qarz.example.uz");
    expect(publicOrigin("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  });

  it("refuses anything that is not one, rather than guessing a host", () => {
    for (const bad of ["", "   ", "qarz.example.uz", "/web/", "//qarz.example.uz", "ftp://x.uz", undefined, 42, null]) {
      expect(publicOrigin(bad), String(bad)).toBeNull();
    }
  });

  it("keeps a path prefix, so a site served under one still gets a canonical link", () => {
    expect(publicOrigin("https://example.uz/app")).toBe("https://example.uz/app");
    expect(landingUrl("https://example.uz/app")).toBe("https://example.uz/app/web/");
  });
});

describe("what the page's head carries", () => {
  const origin = "https://qarz.example.uz";

  it("has the canonical link, the sharing card and the structured data when the address is known", () => {
    const head = seoHead(origin, PRICE_UZS_DEFAULT);
    expect(head).toContain(`<link rel="canonical" href="${origin}/web/" />`);
    expect(head).toContain(`<meta property="og:url" content="${origin}/web/" />`);
    expect(head).toContain(`<meta property="og:image" content="${origin}/panel/icons/icon-512.png" />`);
    expect(head).toContain('<script type="application/ld+json">');
    expect(JSON.parse(head.slice(head.indexOf(">", head.indexOf("ld+json")) + 1, head.lastIndexOf("</script>")))).toHaveProperty(
      "@graph",
    );
  });

  it("has the structured data alone when it is not, and never a guessed host", () => {
    const head = seoHead(null, PRICE_UZS_DEFAULT);
    expect(head).not.toContain("canonical");
    expect(head).not.toContain("og:url");
    expect(head).not.toContain("og:image");
    // Nothing points at a host: the only absolute address is schema.org's, which names the vocabulary.
    expect(head).not.toContain("/web/");
    expect(head).toContain('<script type="application/ld+json">');
  });
});

describe("the structured data", () => {
  it("names the product, and states the price the page prints", () => {
    const data = structuredData("https://qarz.example.uz", 100_000);
    expect(data["@context"]).toBe("https://schema.org");
    const graph = data["@graph"] as Record<string, unknown>[];
    expect(graph.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    expect(graph[0]?.["name"]).toBe(BRAND_NAME);
    expect(graph[2]?.["offers"]).toEqual({ "@type": "Offer", price: "100000", priceCurrency: "UZS" });
  });

  it("leaves the address and the logo out when the build was not told one", () => {
    const graph = structuredData(null, 100_000)["@graph"] as Record<string, unknown>[];
    expect(graph[0]).not.toHaveProperty("url");
    expect(graph[0]).not.toHaveProperty("logo");
    expect(graph[1]).not.toHaveProperty("url");
  });
});

describe("robots.txt", () => {
  it("lets the public page be crawled and closes the application's own entries", () => {
    const text = robotsTxt("https://qarz.example.uz");
    expect(text).toMatch(/^User-agent: \*\nAllow: \/\n/);
    for (const path of ["/app/", "/panel/", "/admin/", "/k/", "/api/", "/files/", "/pay/", "/tg/"]) {
      expect(text).toContain(`Disallow: ${path}`);
    }
    expect(text).toContain("Sitemap: https://qarz.example.uz/web/sitemap.xml");
  });

  it("carries no Sitemap line when the address is not known, because it must be absolute", () => {
    const text = robotsTxt(null);
    expect(text).toContain("Allow: /");
    expect(text).not.toContain("Sitemap:");
  });
});

describe("sitemap.xml", () => {
  it("lists the one public page with the day it was built", () => {
    const xml = sitemapXml("https://qarz.example.uz", "2026-10-12");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<loc>https://qarz.example.uz/web/</loc>");
    expect(xml).toContain("<lastmod>2026-10-12</lastmod>");
  });

  it("is not written at all without an address", () => {
    expect(sitemapXml(null, "2026-10-12")).toBeNull();
  });
});
