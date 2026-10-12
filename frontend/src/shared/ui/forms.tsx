import { useState, type FormEvent } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { type ApiError, cleanReason, REASON_MAX, REASON_MIN } from "../api";
import { errorText } from "./errors";

/** Message under a form field; `id` is what the field's aria-describedby points at. */
export function FieldError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p className="field__error" id={id} role="alert">
      {message}
    </p>
  ) : null;
}

/**
 * A short reason, 3 to 300 characters: a customer's objection to an entry, or the shop's reason for
 * declining one. `onSubmit` receives the tidied text and is not called while the text does not fit.
 */
export function ReasonForm({
  id,
  label,
  hint,
  submitLabel,
  pending,
  error = null,
  errorDetail = null,
  onSubmit,
  onCancel,
}: {
  id: string;
  label: string;
  hint: string;
  submitLabel: string;
  pending: boolean;
  error?: ApiError | null;
  /** What the catalog can add to the server's refusal. */
  errorDetail?: string | null;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const reason = cleanReason(text);
    if (reason === null) {
      setProblem(t("reason.invalid", { min: REASON_MIN, max: REASON_MAX }));
      return;
    }
    onSubmit(reason);
  };

  return (
    <form className="form notice" onSubmit={submit} noValidate>
      {error ? (
        <div role="alert">
          <p className="field__error">{errorText(error, t)}</p>
          {errorDetail ? <p className="field__error">{errorDetail}</p> : null}
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <textarea
          id={id}
          className="input input--text"
          rows={3}
          value={text}
          maxLength={1000}
          aria-invalid={problem !== null}
          aria-describedby={`${id}-hint ${id}-error`}
          onChange={(event) => {
            setText(event.target.value);
            setProblem(null);
          }}
        />
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
        <FieldError id={`${id}-error`} message={problem} />
      </div>
      <p className="actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? t("state.saving") : submitLabel}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={pending}>
          {t("action.cancel")}
        </button>
      </p>
    </form>
  );
}
