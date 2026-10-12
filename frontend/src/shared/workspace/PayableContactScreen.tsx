import { useState, type FormEvent } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { NewPayableEntry, PayableContact, PayableEntry } from "../api";
import { formatMoney } from "../format";
import { useLoad, useSubmit } from "../hooks";
import { type Currency, parseMoney } from "../money";
import { NotFoundScreen } from "../screens";
import { useMay, useWorkspace } from "./context";
import { amountMessage } from "./EntryScreen";
import { PayableForm } from "./PayableForm";
import {
  Avatar,
  Badge,
  Empty,
  ENTRY_KIND_LABELS,
  errorText,
  Failure,
  FieldError,
  formatInstant,
  Loading,
  PayableMoney,
  ReasonForm,
} from "./parts";

/** The kinds a person records directly: a debt taken on, an opening balance, or a payment. */
const RECORD_KINDS = ["credit", "opening", "payment"] as const;
type RecordKind = (typeof RECORD_KINDS)[number];

/** The currency of a book or an entry the server tagged: so'm is the absence of the tag. */
function currencyOf(value: string): Currency | undefined {
  return value === "USD" ? "USD" : undefined;
}

function RecordForm({
  contact,
  onSaved,
  onCancel,
}: {
  contact: PayableContact;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { api } = useWorkspace();
  const { t } = useI18n();
  // Dollars are offered the way the counter offers them: only when the contact already has a dollar book.
  const dollars = contact.books.some((book) => book.currency === "USD");
  const [kind, setKind] = useState<RecordKind>("credit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [note, setNote] = useState("");
  const [promised, setPromised] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const { state, submit } = useSubmit((payload: NewPayableEntry, key) =>
    api.recordPayable(contact.id, payload, key).then((updated) => {
      onSaved();
      return updated;
    }),
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseMoney(amount, currency);
    setProblem(parsed.ok ? null : amountMessage(parsed.problem, t, currency));
    if (!parsed.ok) {
      return;
    }
    submit({
      kind,
      amount: parsed.amount,
      ...(currency === "USD" ? { currency } : {}),
      note: note.trim() === "" ? null : note.trim(),
      // A promised date belongs to a debt; a payment is not owed to anyone.
      promisedDate: kind === "payment" || promised.trim() === "" ? null : promised.trim(),
    });
  };

  const failure = state.status === "error" ? state.error : null;
  const pending = state.status === "pending" || state.status === "done";

  return (
    <form className="form notice" onSubmit={onSubmit} noValidate>
      {failure ? (
        <p className="field__error" role="alert">
          {errorText(failure, t)}
        </p>
      ) : null}
      <div className="toggle" role="group" aria-label={t("payables.record")}>
        {RECORD_KINDS.map((option) => (
          <button
            key={option}
            type="button"
            className="toggle__option"
            aria-pressed={kind === option}
            disabled={pending}
            onClick={() => setKind(option)}
          >
            {t(ENTRY_KIND_LABELS[option] ?? "entry.kind.other")}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor="payable-amount">{t(currency === "USD" ? "entry.amount.usd" : "entry.amount")}</label>
        <input
          id="payable-amount"
          className="input"
          inputMode="numeric"
          value={amount}
          aria-invalid={problem !== null}
          aria-describedby="payable-amount-error"
          onChange={(event) => {
            setAmount(event.target.value);
            setProblem(null);
          }}
        />
        <FieldError id="payable-amount-error" message={problem} />
      </div>
      {dollars ? (
        <div className="field">
          <span className="field__label">{t("currency.choose")}</span>
          <div className="toggle" role="group" aria-label={t("currency.choose")}>
            {(["UZS", "USD"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className="toggle__option"
                aria-pressed={currency === option}
                disabled={pending}
                onClick={() => setCurrency(option)}
              >
                {t(option === "USD" ? "currency.usd" : "currency.uzs")}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {kind === "payment" ? null : (
        <div className="field">
          <label htmlFor="payable-promised">{t("payables.promisedDate")}</label>
          <input
            id="payable-promised"
            className="input"
            type="date"
            value={promised}
            onChange={(event) => setPromised(event.target.value)}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="payable-entry-note">{t("payables.note")}</label>
        <input
          id="payable-entry-note"
          className="input"
          value={note}
          maxLength={400}
          autoComplete="off"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <p className="actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? t("state.saving") : t("action.save")}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={pending}>
          {t("action.cancel")}
        </button>
      </p>
    </form>
  );
}

function EntryRow({
  contact,
  entry,
  onReversed,
}: {
  contact: PayableContact;
  entry: PayableEntry;
  onReversed: () => void;
}) {
  const { api } = useWorkspace();
  const { t, language } = useI18n();
  const can = useMay();
  const [reversing, setReversing] = useState(false);
  const { state, submit, reset } = useSubmit((reason: string, key) =>
    api.reversePayable(contact.id, entry.id, reason, key).then((updated) => {
      onReversed();
      return updated;
    }),
  );
  const currency = currencyOf(entry.currency);
  // A reversal is never reversed, and an entry that was already cancelled stays as it is.
  const reversible = entry.kind !== "reversal" && !entry.reversed && can("payables.manage");

  return (
    <li className="row">
      <p className="row__link">
        <span className="row__name">{t(ENTRY_KIND_LABELS[entry.kind] ?? "entry.kind.other")}</span>
        <span className="row__amount">{formatMoney(entry.amount, language, currency)}</span>
      </p>
      <p className="row__meta">
        {formatInstant(entry.createdAt, language)}
        {entry.promisedDate ? ` · ${t("payables.promisedDate")}: ${entry.promisedDate}` : null}
      </p>
      {entry.note ? <p className="row__meta">{entry.note}</p> : null}
      {entry.reversed ? (
        <p className="row__meta">
          <Badge tone="danger">{t("payables.reversed")}</Badge>
        </p>
      ) : null}
      {reversing ? (
        <ReasonForm
          id={`payable-reverse-${entry.id}`}
          label={t("payables.reverse")}
          hint={t("payables.reverse.hint")}
          submitLabel={t("payables.reverse")}
          pending={state.status === "pending"}
          error={state.status === "error" ? state.error : null}
          onSubmit={(reason) => submit(reason)}
          onCancel={() => {
            reset();
            setReversing(false);
          }}
        />
      ) : reversible ? (
        <p className="actions">
          <button type="button" className="button" onClick={() => setReversing(true)}>
            {t("payables.reverse")}
          </button>
        </p>
      ) : null}
    </li>
  );
}

/**
 * One contact the shop owes ("Men qarzdarman"): what it owes, whether it is late, its account's entries,
 * and the actions a manager may take -- recording a debt or a payment, changing the contact, archiving it.
 */
export function PayableContactScreen({ contactId }: { contactId: string }) {
  const { api } = useWorkspace();
  const can = useMay();
  const { t, language } = useI18n();
  const { state, reload } = useLoad((signal) => api.readPayable(contactId, {}, signal), [api, contactId]);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState(false);
  const archiving = useSubmit((archived: boolean, key) =>
    api.setPayableArchived(contactId, archived, key).then((updated) => {
      reload();
      return updated;
    }),
  );

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "error") {
    return state.error.code === "NOT_FOUND" ? <NotFoundScreen /> : <Failure error={state.error} onRetry={reload} />;
  }
  const { contact, entries } = state.data;
  const archived = contact.status === "archived";
  const mayRecord = can("payables.manage") || can("payables.pay");
  const busy = archiving.state.status === "pending";

  return (
    <>
      <div className="card">
        <h2 className="subject">
          <Avatar name={contact.name} />
          {contact.name}
        </h2>
        {contact.phone ? (
          <p className="row__meta">
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
          </p>
        ) : null}
        {contact.note ? <p className="row__meta">{contact.note}</p> : null}
        {archived ? <p className="notice">{t("payables.archived")}</p> : null}

        <p className="balance balance--large">
          <strong>
            <PayableMoney books={contact.books} showLabel />
          </strong>
        </p>
        {contact.books.map((book) =>
          book.overdue > 0 ? (
            <p key={`${book.currency}-late`} className="row__warning">
              <Badge tone="danger">
                {t("payables.overdue", { amount: formatMoney(book.overdue, language, currencyOf(book.currency)) })}
              </Badge>
            </p>
          ) : null,
        )}
        {contact.books.map((book) =>
          book.dueToday > 0 ? (
            <p key={`${book.currency}-today`} className="row__meta">
              <Badge tone="warning">
                {t("payables.dueToday", { amount: formatMoney(book.dueToday, language, currencyOf(book.currency)) })}
              </Badge>
            </p>
          ) : null,
        )}

        {archived || !mayRecord ? null : (
          <p className="actions">
            <button
              type="button"
              className="button button--primary"
              disabled={recording}
              onClick={() => setRecording(true)}
            >
              {t("payables.record")}
            </button>
          </p>
        )}
      </div>

      {can("payables.manage") ? (
        <section aria-label={t("payables.contact.title")}>
          {archiving.state.status === "error" ? (
            <p className="notice notice--error" role="alert">
              {errorText(archiving.state.error, t)}
            </p>
          ) : null}
          {editing ? (
            <PayableForm
              initial={{ name: contact.name, phone: contact.phone, note: contact.note }}
              submitLabel={t("action.save")}
              send={(input, key) =>
                api.updatePayable(contactId, input, key).then((updated) => {
                  setEditing(false);
                  reload();
                  return updated;
                })
              }
              onCancel={() => setEditing(false)}
            />
          ) : (
            <p className="actions">
              <button type="button" className="button" onClick={() => setEditing(true)} disabled={busy}>
                {t("action.edit")}
              </button>
              <button type="button" className="button" onClick={() => archiving.submit(!archived)} disabled={busy}>
                {busy ? t("state.saving") : archived ? t("payables.unarchive") : t("payables.archive")}
              </button>
            </p>
          )}
        </section>
      ) : null}

      {recording ? (
        <RecordForm
          contact={contact}
          onSaved={() => {
            setRecording(false);
            reload();
          }}
          onCancel={() => setRecording(false)}
        />
      ) : null}

      <section aria-labelledby="payable-ledger-title">
        <h2 id="payable-ledger-title">{t("payables.ledger")}</h2>
        {entries.length === 0 ? (
          <Empty>{t("payables.ledger.empty")}</Empty>
        ) : (
          <ul className="rows">
            {entries.map((entry) => (
              <EntryRow key={entry.id} contact={contact} entry={entry} onReversed={reload} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
