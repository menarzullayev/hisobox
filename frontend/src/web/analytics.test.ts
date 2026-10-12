// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The page measures four things and nothing about the person reading it: no cookie, no identifier, no
 * free text, no third-party script, and no sending at all when the reader has asked not to be tracked or
 * the deployment has set no endpoint. These cases hold the module to that, and to the rule that the page
 * never breaks because a counter did.
 */
type Analytics = typeof import("./analytics");

/** A fresh module: the endpoint is read once and kept, so each case needs its own. */
async function fresh(): Promise<Analytics> {
  vi.resetModules();
  return import("./analytics");
}

function denyTracking(): void {
  Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
}

function allowTracking(): void {
  Object.defineProperty(navigator, "doNotTrack", { value: null, configurable: true });
  Object.defineProperty(navigator, "globalPrivacyControl", { value: false, configurable: true });
}

let sent: { url: string; body: unknown }[] = [];

beforeEach(() => {
  sent = [];
  allowTracking();
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: (url: string, body: string) => {
      sent.push({ url, body: JSON.parse(body) as unknown });
      return true;
    },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("with no endpoint set", () => {
  it("is a no-op: nothing is recorded and nothing leaves the page", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "");
    const analytics = await fresh();
    expect(analytics.isEnabled()).toBe(false);
    analytics.track("cta_click", { id: "hero_start" });
    expect(analytics.pending()).toEqual([]);
    analytics.flush();
    expect(sent).toEqual([]);
  });
});

describe("with an endpoint on this origin", () => {
  it("records an event and sends the batch on flush, and on nothing else", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/api/v1/web-events");
    const analytics = await fresh();
    expect(analytics.isEnabled()).toBe(true);

    analytics.track("cta_click", { id: "hero_start", target: "panel" });
    analytics.track("conversion", { id: "final_start" });
    expect(analytics.pending()).toHaveLength(2);
    expect(sent).toEqual([]); // nothing leaves until the page is hidden or unloaded

    analytics.flush();
    expect(analytics.pending()).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe("/api/v1/web-events");
    const body = sent[0]?.body as { events: { name: string; id?: string }[] };
    expect(body.events.map((event) => event.name)).toEqual(["cta_click", "conversion"]);
    expect(body.events[0]?.id).toBe("hero_start");
  });

  it("carries no field beyond the event's name and its few labels", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/api/v1/web-events");
    const analytics = await fresh();
    analytics.track("section_view", { id: "tariflar", language: "uz" });
    analytics.flush();
    const body = sent[0]?.body as { events: Record<string, unknown>[] };
    expect(Object.keys(body.events[0] ?? {}).sort()).toEqual(["at", "id", "language", "name"]);
  });

  it("refuses an endpoint on another host: a reader's behaviour is not sent to another company", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://collector.example/events");
    const analytics = await fresh();
    expect(analytics.isEnabled()).toBe(false);
    analytics.track("cta_click", { id: "hero_start" });
    analytics.flush();
    expect(sent).toEqual([]);
  });
});

describe("when the reader has asked not to be tracked", () => {
  it("sends nothing, whatever the deployment has configured", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/api/v1/web-events");
    denyTracking();
    const analytics = await fresh();
    expect(analytics.trackingRefused()).toBe(true);
    expect(analytics.isEnabled()).toBe(false);
    analytics.track("cta_click", { id: "hero_start" });
    analytics.flush();
    expect(sent).toEqual([]);
  });
});

describe("the queue", () => {
  it("keeps only the most recent events, so a runaway caller cannot grow it without end", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/api/v1/web-events");
    const analytics = await fresh();
    for (let index = 0; index < 40; index += 1) {
      analytics.track("section_view", { id: `s${index}` });
    }
    expect(analytics.pending().length).toBeLessThanOrEqual(24);
    expect(analytics.pending().at(-1)?.id).toBe("s39");
  });

  it("is emptied by reset, which is what a test and nothing else uses", async () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "/api/v1/web-events");
    const analytics = await fresh();
    analytics.track("cta_click", { id: "hero_start" });
    analytics.reset();
    expect(analytics.pending()).toEqual([]);
  });
});
