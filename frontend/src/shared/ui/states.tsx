import type { ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { ApiError } from "../api";
import { ListIcon } from "../icons";
import { errorText } from "./errors";

/**
 * A list that is on its way: grey lines in the shape of rows. The words are there for a screen reader
 * (and for anything that waits for them to go); the lines themselves say nothing to it.
 */
export function Loading() {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <span className="visually-hidden">{t("state.loading")}</span>
      {[0, 1, 2].map((row) => (
        <span key={row} className="loading__row" aria-hidden="true">
          <span className="loading__text">
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--short" />
          </span>
          <span className="skeleton loading__amount" />
        </span>
      ))}
    </div>
  );
}

/** Nothing to list yet: an icon and the sentence that says what is missing, where the list would be. */
export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__icon">{icon ?? <ListIcon />}</span>
      <p className="empty__text">{children}</p>
    </div>
  );
}

/** The end of a list that is longer than one page. */
export function LoadMore({
  loading,
  error,
  onClick,
}: {
  loading: boolean;
  error: ApiError | null;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="more">
      {error ? (
        <p className="field__error" role="alert">
          {errorText(error, t)}
        </p>
      ) : null}
      <button type="button" className="button" onClick={onClick} disabled={loading}>
        {loading ? <span className="spinner" aria-hidden="true" /> : null}
        {loading ? t("state.loading") : t("list.more")}
      </button>
    </div>
  );
}
