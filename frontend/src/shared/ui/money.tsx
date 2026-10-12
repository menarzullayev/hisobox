import { useI18n, type Translate } from "../../i18n/I18nProvider";
import type { Language } from "../../i18n/types";
import type { Overdue, PayableBook } from "../api";
import { formatMoney } from "../format";
import { CURRENCIES, type Currency } from "../money";
import { Badge } from "./elements";

/**
 * "45 000 so'm muddati o'tgan · 12 kun kechikkan", and what falls due today, when there is any. The
 * dollar debt has lines of its own, with `currency`.
 */
export function OverdueLines({ overdue, currency }: { overdue: Overdue; currency?: Currency }) {
  const { t, language } = useI18n();
  return (
    <>
      {overdue.amount > 0 ? (
        <p className="row__warning">
          <span>{t("overdue.amount", { amount: formatMoney(overdue.amount, language, currency) })}</span>
          {overdue.days > 0 ? <Badge tone="danger">{t("overdue.days", { count: overdue.days })}</Badge> : null}
        </p>
      ) : null}
      {overdue.dueToday > 0 ? (
        <p className="row__meta">
          <Badge tone="warning">
            {t("due.todayAmount", { amount: formatMoney(overdue.dueToday, language, currency) })}
          </Badge>
        </p>
      ) : null}
    </>
  );
}

/**
 * A balance in words. What is owed is the amount as it always was. A balance below zero is money the
 * shop holds of a customer who paid ahead (an advance): it is said as "in credit" with the amount
 * itself, never as a debt with a minus sign and never by a color. `mine` words it for the customer's
 * own page.
 */
export function owedText(amount: number, language: Language, t: Translate, currency?: Currency, mine = false): string {
  return amount < 0
    ? t(mine ? "balance.inCredit.mine" : "balance.inCredit", { amount: formatMoney(-amount, language, currency) })
    : formatMoney(amount, language, currency);
}

/** Nothing is owed in either currency and an advance is held in at least one: "Debt:" would be the wrong label. */
export function inCredit(uzs: number, usd: number | undefined): boolean {
  const cents = usd ?? 0;
  return uzs <= 0 && cents <= 0 && (uzs < 0 || cents < 0);
}

/** A debt in one currency and an advance in the other: two things to say, each under its own name. */
export function isMixed(uzs: number, usd: number | undefined): boolean {
  const cents = usd ?? 0;
  return (uzs > 0 && cents < 0) || (uzs < 0 && cents > 0);
}

/**
 * What is owed, in so'm and, for a shop that works in dollars, in dollars beside it. The two are never
 * added. Without a dollar figure this is the so'm amount as plain text, exactly as it always was. An
 * advance is worded by `owedText`.
 *
 * A debt in one currency with an advance in the other is written as two parts, the debt first and each
 * with its own label: "Qarz: 25.00 $ · Haqdor: 15 000 so'm". `label` names the debt there; without it
 * the usual one does ("Qarz:", or "Qarzingiz:" on the customer's own page).
 */
export function Money({
  uzs,
  usd,
  mine = false,
  label,
}: {
  uzs: number;
  usd: number | undefined;
  mine?: boolean;
  label?: string;
}) {
  const { t, language } = useI18n();
  if (usd === undefined) {
    return owedText(uzs, language, t, undefined, mine);
  }
  if (isMixed(uzs, usd)) {
    const [debt, held] =
      uzs > 0
        ? [formatMoney(uzs, language), owedText(usd, language, t, "USD", mine)]
        : [formatMoney(usd, language, "USD"), owedText(uzs, language, t, undefined, mine)];
    return (
      <>
        <span className="money">
          {label ?? t(mine ? "my.balance" : "customer.balance")} {debt}
        </span>
        {" · "}
        <span className="money">{held}</span>
      </>
    );
  }
  return (
    <>
      <span className="money">{owedText(uzs, language, t, undefined, mine)}</span>{" "}
      <span className="money">{owedText(usd, language, t, "USD", mine)}</span>
    </>
  );
}

/**
 * What the shop owes a contact ("Men qarzdarman"), book by book: the debt with its label, or the advance
 * it holds ahead of the contact when the book stands below zero. So'm and dollars are two books and are
 * never added. Without a label the amount is shown alone (a list's row); an advance is always worded, so
 * a balance below zero is never a debt with a minus sign.
 */
export function PayableMoney({ books, showLabel = false }: { books: readonly PayableBook[]; showLabel?: boolean }) {
  const { t, language } = useI18n();
  const owed = books.filter((book) => book.balance !== 0);
  if (owed.length === 0) {
    return <>{formatMoney(0, language)}</>;
  }
  return (
    <>
      {owed.map((book, position) => {
        const currency = book.currency === "USD" ? ("USD" as Currency) : undefined;
        const amount = formatMoney(Math.abs(book.balance), language, currency);
        const words =
          book.balance < 0
            ? t("payables.advance", { amount })
            : showLabel
              ? t("payables.owed", { amount })
              : amount;
        return (
          <span key={book.currency} className="money">
            {position > 0 ? " · " : null}
            {words}
          </span>
        );
      })}
    </>
  );
}

/**
 * The line that names a balance: the label, then the amounts. A customer who is only in credit has no
 * "Debt:" in front: the words of the advance say what the figure is. With a debt in one currency and an
 * advance in the other, the label goes to the debt alone (see `Money`).
 */
export function BalanceLine({
  label,
  uzs,
  usd,
  large = false,
  mine = false,
}: {
  label: string;
  uzs: number;
  usd: number | undefined;
  large?: boolean;
  mine?: boolean;
}) {
  const mixed = isMixed(uzs, usd);
  return (
    <p className={large ? "balance balance--large" : "balance"}>
      {mixed || inCredit(uzs, usd) ? null : (
        <>
          <span>{label}</span>{" "}
        </>
      )}
      <strong>
        <Money uzs={uzs} usd={usd} mine={mine} {...(mixed ? { label } : {})} />
      </strong>
    </p>
  );
}

/** So'm or dollars: the choice a form or a list offers only in a shop that works in dollars. */
export function CurrencyToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="toggle" role="group" aria-label={t("currency.choose")}>
      {CURRENCIES.map((currency) => (
        <button
          key={currency}
          type="button"
          className="toggle__option"
          aria-pressed={value === currency}
          disabled={disabled}
          onClick={() => onChange(currency)}
        >
          {t(currency === "USD" ? "currency.usd" : "currency.uzs")}
        </button>
      ))}
    </div>
  );
}
