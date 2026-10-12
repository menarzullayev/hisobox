/**
 * The hero's workspace: the product's own board with its screens floating around it, drawn with CSS
 * three-dimensional transforms and a plain 2D canvas rather than a WebGL library. The reason is the
 * page's first load: the marketing page shares the bundle budget's discipline with the applications,
 * and a WebGL engine would be several hundred kilobytes spent before the reader has read a word. What
 * is here weighs a few kilobytes, runs on a phone, and needs no GPU.
 *
 * What it does: the composition turns with a drag (mouse, pen or a finger), each screen can be selected
 * to bring it forward, and the background is a slow field of points. What it never does: take the
 * reader's attention hostage. Nothing turns on its own once the reader has touched it, the motion stops
 * entirely for someone who asked for less of it, and every screen is a real button, reachable with Tab
 * and usable with Enter, so the picture is not the only way to the content.
 *
 * Loaded on demand (`React.lazy` in Landing.tsx) so the headline and the two calls to action are on
 * screen before this file is fetched.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { useI18n } from "../i18n/I18nProvider";
import type { MessageKey } from "../i18n/types";
import { track } from "./analytics";
import "./workspace3d.css";

/** One floating screen: where it sits around the board, and how far in front of it. */
type Panel = {
  readonly id: string;
  readonly key: MessageKey;
  readonly x: string;
  readonly y: string;
  readonly z: string;
  readonly delay: string;
};

/**
 * The six screens, in the order the product names them. The offsets are in `rem` so that the whole
 * composition shrinks with the text size, and each is a little in front of the board (`--z`), which is
 * what makes the group read as a workspace rather than a picture.
 */
const PANELS: readonly Panel[] = [
  { id: "reports", key: "landing.workspace.panel.reports", x: "-7.5rem", y: "-9.5rem", z: "28px", delay: "0ms" },
  { id: "customers", key: "landing.workspace.panel.customers", x: "8rem", y: "-6.5rem", z: "46px", delay: "70ms" },
  { id: "ledger", key: "landing.workspace.panel.ledger", x: "-9.5rem", y: "0.5rem", z: "20px", delay: "140ms" },
  { id: "cash", key: "landing.workspace.panel.cash", x: "9.5rem", y: "1.5rem", z: "34px", delay: "210ms" },
  { id: "stock", key: "landing.workspace.panel.stock", x: "-5.5rem", y: "9rem", z: "42px", delay: "280ms" },
  { id: "staff", key: "landing.workspace.panel.staff", x: "6.5rem", y: "9.5rem", z: "24px", delay: "350ms" },
];

/** How far a drag may turn the composition, so that it never ends up edge-on or upside down. */
const TURN_LIMIT = 18;
/** How much a pointer move turns it: degrees per pixel. */
const TURN_PER_PIXEL = 0.22;

/** Whether the reader has asked for less motion. Read once, and watched, because the setting can change. */
function prefersLessMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Whether a 2D canvas can be drawn on at all. A browser without one still gets the composition. */
function hasCanvas(): boolean {
  try {
    return document.createElement("canvas").getContext("2d") !== null;
  } catch {
    return false;
  }
}

/**
 * One frame of the background: a grid of faint dots that drift, with the ones nearest the pointer a
 * little brighter. Static when motion is not wanted: the same grid, drawn once, no drifting.
 */
function paint(canvas: HTMLCanvasElement, time: number, pointer: { x: number; y: number } | null, ink: string): void {
  const context = canvas.getContext("2d");
  if (context === null) {
    return;
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = ink;

  const step = 34;
  const radius = 1.4;
  const drift = time / 5200;
  for (let x = step / 2; x < width; x += step) {
    for (let y = step / 2; y < height; y += step) {
      const wobble = Math.sin(drift + (x + y) / 240) * 3;
      const near =
        pointer === null ? 0 : Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / 190);
      context.globalAlpha = 0.16 + near * 0.5;
      context.beginPath();
      context.arc(x + wobble, y + wobble, radius + near * 1.4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;
}

/**
 * The colour the dots are painted in: the accent ink of the design tokens, read from the document rather
 * than written here, so the field follows the light/dark theme and the high-contrast modes with no
 * colour value in this file at all.
 */
function fieldColor(element: HTMLElement): string {
  const value = getComputedStyle(element).getPropertyValue("--hb-accent-ink").trim();
  return value === "" ? "currentColor" : value;
}

export function Workspace3D() {
  const { t } = useI18n();
  const root = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hint, setHint] = useState(true);
  const [turn, setTurn] = useState({ x: 0, y: 0 });
  const [moved, setMoved] = useState(false);
  const [staticOnly, setStaticOnly] = useState(() => prefersLessMotion() || !hasCanvas());

  // The reader's setting can change while the page is open (a system toggle), and the page follows it.
  useEffect(() => {
    if (typeof matchMedia !== "function") {
      return;
    }
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const follow = () => setStaticOnly(query.matches || !hasCanvas());
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, []);

  // The background: one frame when motion is not wanted, a slow loop otherwise, and no loop at all
  // while the composition is scrolled out of sight.
  useEffect(() => {
    const element = canvas.current;
    if (element === null || staticOnly) {
      return;
    }
    const surface = element;
    let frame = 0;
    let tick = 0;
    let running = false;
    let pointer: { x: number; y: number } | null = null;
    let ink = fieldColor(surface);

    const step = (now: number) => {
      // The theme can change under the page; the dots follow it, checked about once a second.
      if (tick++ % 90 === 0) {
        ink = fieldColor(surface);
      }
      paint(surface, now, pointer, ink);
      frame = requestAnimationFrame(step);
    };
    const start = () => {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const onMove = (event: PointerEvent) => {
      const box = surface.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    };

    start();
    window.addEventListener("pointermove", onMove, { passive: true });
    const watcher =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([entry]) => (entry?.isIntersecting ? start() : stop()), { threshold: 0 })
        : null;
    watcher?.observe(surface);
    return () => {
      stop();
      watcher?.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [staticOnly]);

  const dismiss = useCallback(() => setHint(false), []);

  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    // A press on a screen is a selection, not the start of a turn.
    if ((event.target as HTMLElement).closest("button") !== null) {
      return;
    }
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setMoved(true);
    setHint(false);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const held = drag.current;
      if (held === null || held.id !== event.pointerId || staticOnly) {
        return;
      }
      const dx = event.clientX - held.x;
      const dy = event.clientY - held.y;
      held.x = event.clientX;
      held.y = event.clientY;
      setTurn((current) => ({
        x: Math.max(-TURN_LIMIT, Math.min(TURN_LIMIT, current.x - dy * TURN_PER_PIXEL)),
        y: Math.max(-TURN_LIMIT, Math.min(TURN_LIMIT, current.y + dx * TURN_PER_PIXEL)),
      }));
    },
    [staticOnly],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

  const choose = useCallback((id: string) => {
    setSelected((current) => (current === id ? null : id));
    setHint(false);
    track("section_view", { id: `workspace_${id}` });
  }, []);

  return (
    <div
      ref={root}
      className="ws"
      role="group"
      aria-label={t("landing.workspace.label")}
      data-static={staticOnly ? "true" : undefined}
      data-moved={moved ? "true" : undefined}
      data-selected={selected ?? undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {staticOnly ? null : <canvas ref={canvas} className="ws__field" aria-hidden="true" />}

      <div className="ws__stage" style={{ transform: `rotateX(${turn.x}deg) rotateY(${turn.y}deg)` }}>
        <div className="ws__group">
          <div className="ws__board" aria-hidden="true">
            <div className="ws__bar">
              <span className="ws__dot" />
              <span className="ws__dot" />
              <span className="ws__dot" />
              <span className="ws__board-name">{t("landing.workspace.panel.dashboard")}</span>
            </div>
            <div className="ws__figure">
              <span className="ws__figure-value" />
              <span className="ws__figure-label" />
            </div>
            <div className="ws__rows">
              {[0, 1, 2, 3].map((row) => (
                <span className="ws__row" key={row} />
              ))}
            </div>
          </div>

          {PANELS.map((panel) => (
            <button
              key={panel.id}
              type="button"
              className="ws__panel"
              data-panel={panel.id}
              aria-pressed={selected === panel.id}
              onClick={() => choose(panel.id)}
              style={{
                // The place in the group is inline because it is what the reader changes: the turn is
                // the stage's, the chosen screen's own step forward is this one's.
                transform: `translate3d(${panel.x}, ${panel.y}, ${selected === panel.id ? "96px" : panel.z})`,
                transitionDelay: panel.delay,
              }}
            >
              <span className="ws__panel-title">{t(panel.key)}</span>
              <span className="ws__panel-lines" aria-hidden="true">
                <span className="ws__line" />
                <span className="ws__line ws__line--short" />
              </span>
            </button>
          ))}
        </div>
      </div>

      {hint ? (
        <button type="button" className="ws__hint" onClick={dismiss}>
          <span className="ws__hint-text">{t("landing.workspace.hint")}</span>
          <span className="visually-hidden">{t("landing.workspace.dismiss")}</span>
        </button>
      ) : null}
    </div>
  );
}

export default Workspace3D;
