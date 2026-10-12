/**
 * What the landing page measures, and what it refuses to measure.
 *
 * The page records four things, all of them about the page and none about the person: that a call to
 * action was clicked, that the visitor went on to the app or the registration, that a section was read
 * far enough to count, and that the page reached the end (the conversion the page is for). Every event
 * is a name and a few short labels — no cookie, no identifier, no free text, no address, no user-agent
 * string, no third-party script. The reader is not asked to consent because nothing personal is kept:
 * a count of clicks is not a person.
 *
 * Where the events go: `VITE_ANALYTICS_ENDPOINT`, a path on this same origin (`/api/...`). A value that
 * is not a same-origin path is refused, because sending a reader's behaviour to another company is
 * exactly what this module exists not to do. With no setting, or when the reader has asked not to be
 * tracked, the module is a no-op that costs a function call — and the page works the same.
 *
 * Usage: `track("cta_click", { id: "hero_start", target: "panel" })`. Nothing here throws: a landing
 * page must not break because a counter did.
 */

/** What the page records. A closed set, so a caller cannot invent a field by accident. */
export type WebEventName = "cta_click" | "app_navigate" | "section_view" | "conversion";

/** The labels an event may carry: short, from the page's own markup, never about the reader. */
export type WebEventDetail = Readonly<{
  /** Which call to action or section: `hero_start`, `pricing`, `final_start`, ... */
  id?: string;
  /** Where it leads: `panel`, `telegram`, or a section's anchor. */
  target?: string;
  /** The language the page is being read in (one of the interface's own codes). */
  language?: string;
}>;

type Envelope = WebEventDetail & { name: WebEventName; at: number };

/** How many events may wait for one send. The page makes far fewer than this; the cap is a guard. */
const MAX_QUEUE = 24;

let queue: Envelope[] = [];
let endpoint: string | null = null;
let resolved = false;

/**
 * The endpoint, read once. A path on this origin only: a full URL, a protocol-relative URL or a
 * bare host is not a place this page will send anything.
 */
function target(): string | null {
  if (!resolved) {
    resolved = true;
    const raw = import.meta.env["VITE_ANALYTICS_ENDPOINT"];
    const value = typeof raw === "string" ? raw.trim() : "";
    endpoint = value.startsWith("/") && !value.startsWith("//") ? value : null;
  }
  return endpoint;
}

/**
 * Whether the reader has asked not to be tracked. `navigator.doNotTrack` is the older signal and
 * `globalPrivacyControl` the newer one; either being on is enough. Both absent is not a refusal.
 */
export function trackingRefused(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  const dnt = navigator.doNotTrack;
  if (dnt === "1" || dnt === "yes") {
    return true;
  }
  const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
  return gpc === true;
}

/** Whether the module will send anything at all: an endpoint is set and the reader has not refused. */
export function isEnabled(): boolean {
  return target() !== null && !trackingRefused();
}

/** The events waiting to be sent, for a test or for a page that wants to hand them on itself. */
export function pending(): readonly Envelope[] {
  return queue;
}

/** Forgets what is waiting. The page's own unload handler sends first, so this is for tests. */
export function reset(): void {
  queue = [];
}

/**
 * Records one event. Nothing leaves the page yet: the queue is sent when the page is hidden or
 * unloaded, which is one request per visit instead of one per click.
 */
export function track(name: WebEventName, detail: WebEventDetail = {}): void {
  if (!isEnabled()) {
    return;
  }
  queue.push({ name, ...detail, at: Date.now() });
  if (queue.length > MAX_QUEUE) {
    queue = queue.slice(-MAX_QUEUE);
  }
}

/** The body one send carries: the events, as JSON. `sendBeacon` takes a string, not a `Blob`. */
function body(events: readonly Envelope[]): string {
  return JSON.stringify({ events });
}

/**
 * Sends what is waiting, once. Prefers `sendBeacon`, which survives the page being closed; falls back
 * to `fetch` with `keepalive`. A failure drops the batch: a lost count is better than a retry loop on
 * a page the reader has already left.
 */
export function flush(): void {
  const url = target();
  if (url === null || queue.length === 0) {
    return;
  }
  const events = queue;
  queue = [];
  const payload = body(events);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(url, payload)) {
        return;
      }
    }
    void fetch(url, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
      () => undefined,
    );
  } catch {
    // A page that cannot reach its counter is still a page.
  }
}

/**
 * Starts sending: the queue goes out when the page is hidden or unloaded, and on the way out the page's
 * last event (the conversion) rides along. Returns how to stop listening.
 */
export function start(): () => void {
  if (typeof document === "undefined" || !isEnabled()) {
    return () => undefined;
  }
  const onHidden = () => {
    if (document.visibilityState === "hidden") {
      flush();
    }
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", flush);
  return () => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", flush);
  };
}
