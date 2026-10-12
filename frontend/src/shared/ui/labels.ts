import type { Language, MessageKey } from "../../i18n/types";
import { formatDateTime } from "../format";

/** The kind of a ledger entry, as a row names it. */
export const ENTRY_KIND_LABELS: Readonly<Record<string, MessageKey>> = {
  credit: "entry.kind.credit",
  payment: "entry.kind.payment",
  reversal: "entry.kind.reversal",
  opening: "entry.kind.opening",
};

/** An instant from the server as a Tashkent date and time; text that is not a date is shown as it came. */
export function formatInstant(iso: string, language: Language): string {
  const instant = new Date(iso);
  return Number.isNaN(instant.getTime()) ? iso : formatDateTime(instant, language);
}
