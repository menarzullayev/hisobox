import { useI18n } from "../../i18n/I18nProvider";
import type { ApiError } from "../api";
import { errorText } from "./errors";

/** A failed call, with the way to try it again. */
export function Failure({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="notice notice--error" role="alert">
      <p>{errorText(error, t)}</p>
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          {t("action.retry")}
        </button>
      ) : null}
    </div>
  );
}
