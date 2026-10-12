import type { Translate } from "../../i18n/I18nProvider";
import { type ApiError, NETWORK_ERROR, NO_ANSWER, TIMEOUT } from "../api";

/**
 * Text for a failed call. The server's message is already in the user's language and is shown as it is;
 * the catalog only speaks when the server could not (no connection, or an answer that is not the API's).
 */
export function errorText(error: ApiError, t: Translate): string {
  // The server words this one in Uzbek only, whatever the reader's language: the catalog speaks instead.
  if (error.code === "BODY_TOO_LARGE") {
    return t("error.bodyTooLarge");
  }
  if (error.code === "RATE_LIMITED") {
    const said = error.serverMessage ?? t("error.rateLimited");
    return error.retryAfter === null ? said : `${said} ${t("error.wait", { count: error.retryAfter })}`;
  }
  if (error.serverMessage) {
    return error.serverMessage;
  }
  if (error.code === TIMEOUT) {
    return t("error.timeout");
  }
  // A write this page stopped waiting for: it may have been applied, and the words must not deny it.
  if (error.code === NO_ANSWER) {
    return t("error.noAnswer");
  }
  return error.code === NETWORK_ERROR ? t("error.network") : t("state.error");
}
