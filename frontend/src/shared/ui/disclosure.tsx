import type { ReactNode } from "react";

import { ChevronDownIcon } from "../icons";

/**
 * A part of a page that opens and closes. The real `<details>`/`<summary>` stays — the keyboard, a
 * screen reader and the browser's own find-in-page keep working — and the marker the browser draws is
 * replaced by our chevron, which turns as the part opens. `variant="more"` is the row that hides the
 * tail of a list.
 */
export function Disclosure({
  summary,
  children,
  variant = "row",
  open = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  variant?: "row" | "more";
  open?: boolean;
}) {
  return (
    <details className={variant === "more" ? "disc disc--more" : "disc"} open={open}>
      <summary className="disc__head">
        <span className="disc__title">{summary}</span>
        <ChevronDownIcon />
      </summary>
      <div className="disc__body">{children}</div>
    </details>
  );
}
