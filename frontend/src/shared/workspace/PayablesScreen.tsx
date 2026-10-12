import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { PayableContact } from "../api";
import { usePagedList } from "../hooks";
import { PlusIcon, SearchIcon, UsersIcon } from "../icons";
import { Link } from "../router";
import { useMay, useWorkspace } from "./context";
import { PayableForm } from "./PayableForm";
import { Avatar, Empty, Failure, Loading, LoadMore, PayableMoney } from "../ui";

/** How long typing must pause before the list is searched again. */
const SEARCH_DELAY_MS = 300;
const MAX_QUERY_LENGTH = 80;

type Status = "active" | "archived";

function Row({ contact }: { contact: PayableContact }) {
  return (
    <li className="row row--person">
      <Link to={`/payables/${contact.id}`} className="row__link">
        <Avatar name={contact.name} />
        <span className="row__name">{contact.name}</span>
        <span className="row__amount">
          <PayableMoney books={contact.books} />
        </span>
      </Link>
      {contact.phone ? <p className="row__meta">{contact.phone}</p> : null}
    </li>
  );
}

/**
 * The contacts the shop owes ("Men qarzdarman"), with search by name and a split of active and archived.
 * A row opens the contact's account, where a debt or a payment is recorded.
 */
export function PayablesScreen() {
  const { api } = useWorkspace();
  const can = useMay();
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [adding, setAdding] = useState(false);

  // Search as the person types, once typing pauses; submitting the form searches at once.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const { state, reload, loadMore } = usePagedList(
    (cursor, signal) => api.listPayables({ q: query, status, cursor }, signal),
    [api, query, status],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(text.trim());
  };

  let body: ReactNode;
  if (state.status === "loading") {
    body = <Loading />;
  } else if (state.status === "error") {
    body = <Failure error={state.error} onRetry={reload} />;
  } else if (state.items.length === 0) {
    body = (
      <Empty icon={<UsersIcon />}>
        {query !== "" ? t("payables.noMatch") : status === "archived" ? t("payables.noArchived") : t("payables.none")}
      </Empty>
    );
  } else {
    body = (
      <>
        <ul className="rows">
          {state.items.map((contact) => (
            <Row key={contact.id} contact={contact} />
          ))}
        </ul>
        {state.nextCursor !== null ? (
          <LoadMore loading={state.loadingMore} error={state.moreError} onClick={loadMore} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <form className="search search--icon" role="search" onSubmit={onSubmit}>
        <SearchIcon />
        <input
          type="search"
          className="input"
          value={text}
          maxLength={MAX_QUERY_LENGTH}
          aria-label={t("payables.search")}
          placeholder={t("payables.search")}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="button">
          {t("action.search")}
        </button>
      </form>
      <div className="bar">
        <div className="toggle" role="group" aria-label={t("payables.status")}>
          <button
            type="button"
            className="toggle__option"
            aria-pressed={status === "active"}
            onClick={() => setStatus("active")}
          >
            {t("payables.status.active")}
          </button>
          <button
            type="button"
            className="toggle__option"
            aria-pressed={status === "archived"}
            onClick={() => setStatus("archived")}
          >
            {t("payables.status.archived")}
          </button>
        </div>
        {can("payables.manage") ? (
          <button type="button" className="button" onClick={() => setAdding((open) => !open)}>
            <PlusIcon />
            {t("payables.add")}
          </button>
        ) : null}
      </div>
      {adding ? (
        <PayableForm
          submitLabel={t("payables.add")}
          send={(input, key) =>
            api.createPayable(input, key).then((contact) => {
              setAdding(false);
              reload();
              return contact;
            })
          }
          onCancel={() => setAdding(false)}
        />
      ) : null}
      {body}
    </>
  );
}
