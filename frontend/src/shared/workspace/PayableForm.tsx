import { useState, type FormEvent } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { ApiError, PayableContact, PayableContactInput } from "../api";
import { useSubmit } from "../hooks";
import { errorText, FieldError } from "../ui";

const MAX_PHONE = 40;
const MAX_NOTE = 400;

/** A contact's name as the server stores it: trimmed, inner white space collapsed. */
export function cleanContactName(raw: string): string {
  return raw.split(/\s+/u).filter(Boolean).join(" ");
}

/** Which field a refusal belongs to, so the message can sit next to it. */
function refused(error: ApiError | null): { name: string | null; phone: string | null; note: string | null } {
  if (error?.code !== "VALIDATION") {
    return { name: null, phone: null, note: null };
  }
  return {
    name: error.fields["name"] ?? null,
    phone: error.fields["phone"] ?? null,
    note: error.fields["note"] ?? null,
  };
}

/**
 * The name, phone and note of a contact, for adding one and for changing one: the same fields, and the
 * account is never touched. `send` performs the write; the caller closes the form and reloads in it.
 */
export function PayableForm({
  initial,
  submitLabel,
  send,
  onCancel,
}: {
  initial?: PayableContactInput | undefined;
  submitLabel: string;
  send: (input: PayableContactInput, key: string) => Promise<PayableContact>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [nameProblem, setNameProblem] = useState<string | null>(null);
  const { state, submit } = useSubmit(send);

  const failure = state.status === "error" ? state.error : null;
  const field = refused(failure);
  const pending = state.status === "pending" || state.status === "done";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const clean = cleanContactName(name);
    if (clean === "") {
      setNameProblem(t("customer.name.required"));
      return;
    }
    submit({
      name: clean,
      phone: phone.trim() === "" ? null : phone.trim(),
      note: note.trim() === "" ? null : note.trim(),
    });
  };

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {failure ? (
        <p className="notice notice--error" role="alert">
          {errorText(failure, t)}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="payable-name">{t("payables.name")}</label>
        <input
          id="payable-name"
          className="input"
          value={name}
          autoComplete="off"
          aria-invalid={nameProblem !== null || field.name !== null}
          aria-describedby="payable-name-error"
          onChange={(event) => {
            setName(event.target.value);
            setNameProblem(null);
          }}
        />
        <FieldError id="payable-name-error" message={nameProblem ?? field.name} />
      </div>
      <div className="field">
        <label htmlFor="payable-phone">{t("payables.phone")}</label>
        <input
          id="payable-phone"
          className="input"
          type="tel"
          inputMode="tel"
          value={phone}
          maxLength={MAX_PHONE}
          autoComplete="off"
          aria-invalid={field.phone !== null}
          aria-describedby="payable-phone-error"
          onChange={(event) => setPhone(event.target.value)}
        />
        <FieldError id="payable-phone-error" message={field.phone} />
      </div>
      <div className="field">
        <label htmlFor="payable-note">{t("payables.note")}</label>
        <input
          id="payable-note"
          className="input"
          value={note}
          maxLength={MAX_NOTE}
          autoComplete="off"
          aria-invalid={field.note !== null}
          aria-describedby="payable-note-error"
          onChange={(event) => setNote(event.target.value)}
        />
        <FieldError id="payable-note-error" message={field.note} />
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
