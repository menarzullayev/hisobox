import type { ReactNode } from "react";

import { AlertIcon, CheckIcon, ClockIcon } from "../icons";

type BadgeTone = "danger" | "warning" | "success" | "accent";

const BADGE_ICONS: Readonly<Record<BadgeTone, (() => ReactNode) | null>> = {
  danger: AlertIcon,
  warning: ClockIcon,
  success: CheckIcon,
  accent: null,
};

/**
 * A short status beside a name or an amount. The words say it; the icon of an overdue, due or paid
 * badge and its color only repeat them, so nothing is told by color alone.
 */
export function Badge({ tone, children }: { tone?: BadgeTone; children: ReactNode }) {
  const ToneIcon = tone ? BADGE_ICONS[tone] : null;
  return (
    <span className={tone ? `badge badge--${tone}` : "badge"}>
      {ToneIcon ? <ToneIcon /> : null}
      <span>{children}</span>
    </span>
  );
}

/** The first letters of the first two words of a name: "Dilnoza Karimova" is "DK". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

/**
 * Decoration beside a person's name, which is always written next to it. The letters are drawn by the
 * style sheet from the attribute, so they are not part of the row's text: nothing reads, copies or
 * searches "DK" in front of the name.
 */
export function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true" data-initials={initials(name)} />;
}
