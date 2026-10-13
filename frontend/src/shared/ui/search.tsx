import { useId, useRef, type ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { SearchIcon, XIcon } from "../icons";

/**
 * A field that looks for something: the mark inside, a way to clear it, and Escape for the same. The
 * real `<input type="search">` stays inside, so the keyboard, a screen reader and the tests are served
 * by the browser as before; only the browser's own clear button is replaced by ours.
 */
export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  children,
}: {
  id: string;
  label?: string | undefined;
  placeholder?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** What to show under the field while it is being typed into (suggestions, a count). */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement | null>(null);
  const clearId = `${id}-clear`;
  return (
    <div className="field">
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <div className="search">
        <SearchIcon />
        <input
          ref={input}
          id={id}
          type="search"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label ? undefined : (placeholder ?? t("action.search"))}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && value.length > 0) {
              onChange("");
            }
          }}
        />
        <button
          type="button"
          id={clearId}
          className="search__clear"
          hidden={value.length === 0}
          aria-label={t("action.clear")}
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <XIcon />
        </button>
      </div>
      {children}
    </div>
  );
}

/** The list a search field shows under itself: rows a person picks from. */
export function Suggestions({ children }: { children: ReactNode }) {
  const id = useId();
  return (
    <ul className="suggestions" id={id}>
      {children}
    </ul>
  );
}
