import { useState, type ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { EyeIcon, EyeOffIcon } from "../icons";

/** What every field of a form shares: the label above, the hint or the error below. */
function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <div className="field">
      {label ? (
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A line of text. The real `<input>` stays inside; the label, the hint and the error are written once
 * here rather than in every screen that has a field.
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  hint,
  error = null,
  prefix,
  suffix,
  disabled = false,
  required = false,
  maxLength,
  onBlur,
}: {
  id: string;
  label?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password" | "tel" | "search";
  inputMode?: "text" | "numeric" | "tel" | "decimal" | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  error?: string | null | undefined;
  /** What stands before the text: "#" for a code, "+998" for a phone. */
  prefix?: string | undefined;
  /** What stands after it: "so'm" for an amount. */
  suffix?: string | undefined;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number | undefined;
  onBlur?: (() => void) | undefined;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className={error ? "input input--invalid" : "input"}>
        {prefix ? <span className="input__affix">{prefix}</span> : null}
        <input
          id={id}
          type={type}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          aria-invalid={error !== null || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
        {suffix ? <span className="input__affix">{suffix}</span> : null}
      </div>
    </FieldShell>
  );
}

/** Several lines of text, with the length said out loud when a screen bounds it. */
export function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
  hint,
  error = null,
  maxLength,
  showCount = false,
  disabled = false,
}: {
  id: string;
  label?: string | undefined;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string | undefined;
  error?: string | null | undefined;
  maxLength?: number | undefined;
  showCount?: boolean;
  disabled?: boolean;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className={error ? "input input--invalid" : "input"}>
        <textarea
          id={id}
          className="input__area"
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error !== null || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {showCount && maxLength ? (
        <p className="field__hint">
          {value.trim().length} / {maxLength}
        </p>
      ) : null}
    </FieldShell>
  );
}

/** Nine digits of an Uzbek number, grouped as a person writes them: 90 123 45 67. */
export function groupPhone(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 9);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(" ");
}

/** A phone number: only digits are kept, and they are grouped while they are typed. */
export function PhoneField({
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
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | null | undefined;
  disabled?: boolean;
}) {
  return (
    <TextField
      id={id}
      label={label}
      value={value}
      type="tel"
      inputMode="tel"
      prefix="+998"
      hint={hint}
      error={error}
      disabled={disabled}
      onChange={(next) => onChange(groupPhone(next))}
    />
  );
}

/** A password, with the way to look at what was typed while it is typed. */
export function PasswordField({
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
  value: string;
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | null | undefined;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className={error ? "input input--invalid" : "input"}>
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          disabled={disabled}
          aria-invalid={error !== null || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="input__reveal"
          aria-pressed={shown}
          aria-label={t("shell.password.reveal")}
          onClick={() => setShown((was) => !was)}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </FieldShell>
  );
}
