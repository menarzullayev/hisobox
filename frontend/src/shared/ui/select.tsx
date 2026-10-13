import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "../icons";

/** One choice of a `Select`: the value that is stored and the words a person reads. */
export type SelectOption = {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
  /** The language the label is written in, so a screen reader says it in that language. */
  readonly lang?: string;
};

/**
 * A choice out of a list, drawn by us: a button that opens a panel. The browser's own `<select>` cannot
 * take the design tokens — its list is drawn by the operating system — so every choice in the product
 * uses this one, from the language picker to a filter.
 *
 * Keyboard: ArrowDown/ArrowUp walk the list, Home/End jump to its ends, Enter picks, Escape closes and
 * gives focus back to the button. A long list (`searchable`) gets a field that filters it.
 */
export function Select({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  searchable = false,
  disabled = false,
  invalid = false,
  hint,
  error,
  labelHidden = false,
}: {
  id: string;
  label?: string | undefined;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  searchable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  hint?: string | undefined;
  error?: string | null | undefined;
  /** The label is read by a screen reader but not shown: a picker in a header has no room for it. */
  labelHidden?: boolean | undefined;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)));
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement | null>(null);
  const search = useRef<HTMLInputElement | null>(null);
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const chosen = options.find((option) => option.value === value);
  const shown = searchable && query.trim().length > 0
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    if (searchable) {
      search.current?.focus();
    }
    const onOutside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, options, searchable, value]);

  const choose = (option: SelectOption | undefined) => {
    if (!option) {
      return;
    }
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) {
      return;
    }
    const move = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (move !== 0) {
      event.preventDefault();
      setActive((at) => (at + move + shown.length) % Math.max(1, shown.length));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, shown.length - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(shown[active]);
    }
  };

  return (
    <div className="field" ref={root}>
      {label ? (
        <label className={labelHidden ? "visually-hidden" : "field__label"} htmlFor={id} id={`${id}-label`}>
          {label}
        </label>
      ) : null}
      <div className={invalid ? "select select--invalid" : "select"}>
        <button
          type="button"
          id={id}
          className="select__button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          {...(label ? { "aria-labelledby": `${id}-label` } : {})}
          {...(hint ? { "aria-describedby": hintId } : {})}
          {...(error ? { "aria-describedby": errorId } : {})}
          disabled={disabled}
          onClick={() => setOpen((was) => !was)}
          onKeyDown={onKeyDown}
        >
          <span className={chosen ? "select__value" : "select__value select__value--empty"}>
            {chosen?.label ?? placeholder ?? t("select.choose")}
          </span>
          <ChevronDownIcon />
        </button>
        {open ? (
          <div className="select__panel">
            {searchable ? (
              <div className="select__search">
                <SearchIcon />
                <input
                  ref={search}
                  type="search"
                  value={query}
                  placeholder={t("action.search")}
                  aria-label={t("action.search")}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActive(0);
                  }}
                />
              </div>
            ) : null}
            <div className="select__list" id={listId} role="listbox" aria-labelledby={label ? `${id}-label` : undefined}>
              {shown.length === 0 ? <p className="select__none">{t("state.empty")}</p> : null}
              {shown.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  lang={option.lang}
                  aria-selected={option.value === value}
                  className={index === active ? "select__option select__option--active" : "select__option"}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  <span>{option.label}</span>
                  {option.hint ? <span className="select__hint">{option.hint}</span> : null}
                  <CheckIcon />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A choice between two or three short words, where opening a panel would be slower than pressing the
 * word itself: so'm / dollar, or the three states of a filter. A group of buttons, one of them pressed.
 */
export function ChoiceChips({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label?: string | undefined;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const groupId = useId();
  return (
    <div className="field">
      {label ? (
        <span className="field__label" id={groupId}>
          {label}
        </span>
      ) : null}
      <div className="chips" role="group" aria-labelledby={label ? groupId : undefined}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="chips__chip"
            aria-pressed={option.value === value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A row of the settings: what the switch does, and the switch itself. */
export function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="setting">
      <div className="setting__words">
        <span className="setting__title">{title}</span>
        {description ? <span className="setting__text">{description}</span> : null}
      </div>
      <div className="setting__control">{control}</div>
    </div>
  );
}
