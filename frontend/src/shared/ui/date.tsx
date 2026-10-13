import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { Language } from "../../i18n/types";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "../icons";

/** A day as the product stores it: `YYYY-MM-DD`, exactly what the API and the native field used. */
export type IsoDay = string;

const pad = (value: number) => String(value).padStart(2, "0");
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (iso: IsoDay): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

/** The day as a person reads it here: 13.10.2026. */
export function formatDay(iso: IsoDay): string {
  const date = fromIso(iso);
  return date ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}` : "";
}

/** The month's name in the reader's language, from the browser's own data. */
function monthName(date: Date, language: Language): string {
  const tag = language === "uz-Cyrl" ? "uz-Cyrl" : language;
  try {
    return new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" }).format(date);
  } catch {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }
}

/** The first two letters of a weekday, in the reader's language. */
function weekdayNames(language: Language): string[] {
  const tag = language === "uz-Cyrl" ? "uz-Cyrl" : language;
  try {
    const format = new Intl.DateTimeFormat(tag, { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 0, 5 + index)));
  } catch {
    return ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
  }
}

/** The grid of one month: six rows of seven days, Monday first. */
function monthGrid(month: Date): { iso: IsoDay; day: number; outside: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const shift = (first.getDay() + 6) % 7;
  const days: { iso: IsoDay; day: number; outside: boolean }[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), 1 - shift + index);
    days.push({ iso: toIso(date), day: date.getDate(), outside: date.getMonth() !== month.getMonth() });
  }
  return days;
}

function Calendar({
  month,
  onMonth,
  selected,
  from,
  to,
  onPick,
  onToday,
  onClear,
}: {
  month: Date;
  onMonth: (next: Date) => void;
  selected?: IsoDay;
  from?: IsoDay;
  to?: IsoDay;
  onPick: (iso: IsoDay) => void;
  onToday: () => void;
  onClear: () => void;
}) {
  const { t, language } = useI18n();
  const today = toIso(new Date());
  const weekdays = useMemo(() => weekdayNames(language), [language]);
  const days = useMemo(() => monthGrid(month), [month]);
  const inRange = (iso: IsoDay) => Boolean(from && to && iso >= from && iso <= to);
  return (
    <div className="cal" role="dialog" aria-label={t("date.choose")}>
      <div className="cal__head">
        <span className="cal__title">{monthName(month, language)}</span>
        <span className="cal__nav">
          <button type="button" aria-label={t("date.previousMonth")} onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeftIcon />
          </button>
          <button type="button" aria-label={t("date.nextMonth")} onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRightIcon />
          </button>
        </span>
      </div>
      <div className="cal__grid">
        {weekdays.map((name) => (
          <span key={name} className="cal__dow">
            {name}
          </span>
        ))}
      </div>
      <div className="cal__grid">
        {days.map((day) => {
          const state =
            day.iso === selected
              ? "sel"
              : day.iso === from
                ? "range-start"
                : day.iso === to
                  ? "range-end"
                  : inRange(day.iso)
                    ? "range"
                    : undefined;
          return (
            <button
              key={day.iso}
              type="button"
              className="cal__day"
              data-outside={day.outside || undefined}
              data-today={day.iso === today || undefined}
              data-state={state}
              onClick={() => onPick(day.iso)}
            >
              {day.day}
            </button>
          );
        })}
      </div>
      <div className="cal__foot">
        <button type="button" className="cal__action" onClick={onToday}>
          {t("date.today")}
        </button>
        <button type="button" className="cal__action" onClick={onClear}>
          <XIcon />
          {t("date.clear")}
        </button>
      </div>
    </div>
  );
}

/**
 * A day, chosen from a calendar we draw: the browser's own field is drawn by the operating system, its
 * months are in the system's language and its weeks may start on Sunday. The value is the same
 * `YYYY-MM-DD` the API reads; what a person sees is 13.10.2026.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  hint,
  error = null,
  disabled = false,
}: {
  id: string;
  label?: string | undefined;
  value: IsoDay;
  onChange: (value: IsoDay) => void;
  hint?: string | undefined;
  error?: string | null | undefined;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => fromIso(value) ?? new Date());
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="field" ref={root}>
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="datefield">
        <button
          type="button"
          id={id}
          className="datefield__button"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            setMonth(fromIso(value) ?? new Date());
            setOpen((was) => !was);
          }}
        >
          <CalendarIcon />
          {value ? <span>{formatDay(value)}</span> : <span className="datefield__empty">{t("date.choose")}</span>}
        </button>
        {open ? (
          <Calendar
            month={month}
            onMonth={setMonth}
            selected={value}
            onPick={(iso) => {
              onChange(iso);
              setOpen(false);
            }}
            onToday={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
            onClear={() => {
              onChange("");
              setOpen(false);
            }}
          />
        ) : null}
      </div>
      {hint && !error ? <p className="field__hint">{hint}</p> : null}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The days a report speaks about: from one day to another, both from the same calendar. */
export function DateRange({
  fromId,
  toId,
  from,
  to,
  onChange,
  label,
  hint,
}: {
  fromId: string;
  toId: string;
  from: IsoDay;
  to: IsoDay;
  onChange: (from: IsoDay, to: IsoDay) => void;
  label?: string | undefined;
  hint?: string | undefined;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => fromIso(from) ?? new Date());
  const [start, setStart] = useState<IsoDay | null>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setStart(null);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="field" ref={root}>
      {label ? <span className="field__label">{label}</span> : null}
      <div className="datefield datefield--range">
        <button
          type="button"
          id={fromId}
          className="datefield__button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setStart(null);
            setOpen((was) => !was);
          }}
        >
          <CalendarIcon />
          {from ? <span>{formatDay(from)}</span> : <span className="datefield__empty">{t("date.choose")}</span>}
        </button>
        <span className="datefield__dash">—</span>
        <button
          type="button"
          id={toId}
          className="datefield__button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setStart(null);
            setOpen((was) => !was);
          }}
        >
          {to ? <span>{formatDay(to)}</span> : <span className="datefield__empty">{t("date.choose")}</span>}
        </button>
        {open ? (
          <Calendar
            month={month}
            onMonth={setMonth}
            from={from}
            to={to}
            onPick={(iso) => {
              if (start === null) {
                setStart(iso);
                onChange(iso, iso);
                return;
              }
              const [first, second] = start <= iso ? [start, iso] : [iso, start];
              onChange(first, second);
              setStart(null);
              setOpen(false);
            }}
            onToday={() => {
              const today = toIso(new Date());
              onChange(today, today);
              setOpen(false);
            }}
            onClear={() => {
              onChange("", "");
              setOpen(false);
            }}
          />
        ) : null}
      </div>
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
