/**
 * The landing page's two pictures of the product: the shop's paper debt book, and the phone that
 * replaces it.
 *
 * The metaphor is the whole argument of the page — a shop keeps its debts in a notebook, and the
 * notebook is what the product is — so the pictures are drawn rather than photographed: a page of
 * squared paper with handwriting on it, and an iPhone-sized frame with the application's own screen
 * inside. Nothing here is an image file. The paper is a colour, two gradients and a grain the browser
 * generates from a filter; the handwriting is the reader's own cursive font; the device is boxes with
 * rounded corners. The whole composition therefore costs a few kilobytes, follows every theme, and
 * sharpens on any screen.
 *
 * Two rules it keeps:
 *   - It shows only what the product does. The entry the card shows is a message typed into Telegram,
 *     which is how an entry is really made (backend/src/hiso_box/domain/chat_entry.py). There is no voice
 *     input and no photographing of a notebook anywhere in the product, so neither is drawn.
 *   - The figures are demonstration figures, and the page says so where it shows them.
 *
 * The pictures carry no text a screen reader needs (they are `aria-hidden`): every word in them is
 * either the application's own wording, repeated from the catalogs, or a demonstration name.
 */
import { useI18n } from "../i18n/I18nProvider";
import { formatUzs } from "../shared/money";
import type { MessageKey } from "../i18n/types";
import "./paperphone.css";

/** What the shop wrote by hand: three lines of the notebook, in the order they were written. */
const NOTES = ["landing.paper.note1", "landing.paper.note2", "landing.paper.note3"] as const satisfies readonly MessageKey[];

/** How many customers the phone's header counts, so the number and the list agree in spirit. */
const CUSTOMER_COUNT = 27;

/**
 * The customers the phone shows. The names are demonstration names; what stands beside them is the
 * application's own wording (`overdue.days`, `due.today`, `due.inDays`) and its own money format, so
 * the screen reads exactly as the real one does. There are more of them than the screen holds, which is
 * what a phone looks like: the list goes on below the edge.
 */
type Debt = {
  readonly name: MessageKey;
  readonly amount: number;
  readonly state: MessageKey;
  readonly count: number;
  readonly tone: "late" | "today" | "soon";
};

const DEBTS: readonly Debt[] = [
  { name: "landing.paper.name1", amount: 1_500_000, state: "overdue.days", count: 10, tone: "late" },
  { name: "landing.paper.name2", amount: 250_000, state: "due.today", count: 0, tone: "today" },
  { name: "landing.paper.name3", amount: 1_200_000, state: "due.inDays", count: 4, tone: "soon" },
  { name: "landing.paper.name4", amount: 480_000, state: "overdue.days", count: 3, tone: "late" },
  { name: "landing.paper.name5", amount: 95_000, state: "due.inDays", count: 12, tone: "soon" },
  { name: "landing.paper.name6", amount: 2_100_000, state: "due.today", count: 0, tone: "today" },
  { name: "landing.paper.name7", amount: 640_000, state: "overdue.days", count: 1, tone: "late" },
  { name: "landing.paper.name8", amount: 310_000, state: "due.inDays", count: 7, tone: "soon" },
];

/** A page of squared paper with handwriting on it. */
function NotebookPage({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={className === undefined ? "pp__paper" : `pp__paper ${className}`} aria-hidden="true">
      <span className="pp__date">{t("landing.paper.date")}</span>
      <ul className="pp__notes">
        {NOTES.map((key) => (
          <li className="pp__note" key={key}>
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The phone: a frame at the size of a real handset, with the application's own screen inside it. */
function Device({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <div className={className === undefined ? "pp__device" : `pp__device ${className}`} aria-hidden="true">
      <div className="pp__frame">
        <div className="pp__screen">
          <div className="pp__status">
            <span className="pp__time">9:41</span>
            <span className="pp__island" />
          </div>
          <div className="pp__app">
            <div className="pp__app-head">
              <span className="pp__app-title">{t("customers.count", { count: CUSTOMER_COUNT })}</span>
              <span className="pp__app-add">+</span>
            </div>
            <p className="pp__search">{t("customers.search")}</p>
            <ul className="pp__list">
              {DEBTS.map((debt) => (
                <li className="pp__row" key={debt.name}>
                  <span className="pp__avatar">{t(debt.name).slice(0, 2).toUpperCase()}</span>
                  <span className="pp__who">
                    <span className="pp__name">{t(debt.name)}</span>
                    <span className={`pp__state pp__state--${debt.tone}`}>
                      {debt.count === 0 ? t(debt.state) : t(debt.state, { count: debt.count })}
                    </span>
                  </span>
                  <span className="pp__amount">{formatUzs(debt.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The hero's picture: the notebook the shop kept, the phone that keeps it now, and the message that
 * moved an entry from one to the other.
 */
export function PaperPhone() {
  const { t } = useI18n();
  return (
    <div className="pp">
      <NotebookPage className="pp__paper--behind" />
      <Device className="pp__device--front" />
      <div className="pp__card">
        <p className="pp__card-where">{t("landing.paper.card.label")}</p>
        <p className="pp__card-said">{t("landing.paper.card.message")}</p>
        <p className="pp__card-done">{t("landing.paper.card.done")}</p>
      </div>
    </div>
  );
}

/**
 * The picture the page's later section makes of the same idea, side by side and labelled: the notebook
 * on the left as it was kept, the phone on the right as it is kept now.
 */
export function PaperToPhone() {
  const { t } = useI18n();
  return (
    <div className="pp-pair">
      <figure className="pp-pair__side">
        <figcaption className="pp-pair__caption">{t("landing.paper.before")}</figcaption>
        <NotebookPage className="pp__paper--flat" />
      </figure>
      <figure className="pp-pair__side">
        <figcaption className="pp-pair__caption">{t("landing.paper.after")}</figcaption>
        <Device className="pp__device--flat" />
      </figure>
    </div>
  );
}

export default PaperPhone;
