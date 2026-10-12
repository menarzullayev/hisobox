import type { ReactNode } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import type { ApiError } from "../api";
import { errorText } from "./errors";

/** A question asked before something that cannot be taken back; nothing is sent until "yes". */
export function Confirm({
  question,
  yes,
  no,
  pending,
  error = null,
  onYes,
  onNo,
}: {
  question: ReactNode;
  yes: string;
  no: string;
  pending: boolean;
  error?: ApiError | null;
  onYes: () => void;
  onNo: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="notice" role="group">
      {error ? (
        <p className="field__error" role="alert">
          {errorText(error, t)}
        </p>
      ) : null}
      {typeof question === "string" ? <p>{question}</p> : question}
      <p className="actions">
        <button type="button" className="button button--primary" onClick={onYes} disabled={pending}>
          {pending ? t("state.saving") : yes}
        </button>
        <button type="button" className="button" onClick={onNo} disabled={pending}>
          {no}
        </button>
      </p>
    </div>
  );
}
