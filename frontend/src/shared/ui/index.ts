import "./ui.css";

/**
 * The interface pieces every screen shares: the states a list can be in, money and balances, badges and
 * avatars, the small forms, and the one door a screen imports them through.
 *
 * The files behind this door are the theme, not the screen: `states`, `money`, `elements`, `forms`,
 * `confirm`, `failure`, `errors`, `labels`. A screen imports from here and never from a file inside.
 */
export { errorText } from "./errors";
export { Failure } from "./failure";
export { Empty, Loading, LoadMore } from "./states";
export { Avatar, Badge, initials } from "./elements";
export {
  BalanceLine,
  CurrencyToggle,
  inCredit,
  isMixed,
  Money,
  owedText,
  OverdueLines,
  PayableMoney,
} from "./money";
export { FieldError, ReasonForm } from "./forms";
export { Confirm } from "./confirm";
export { ENTRY_KIND_LABELS, formatInstant } from "./labels";
// The controls the browser draws for itself are replaced by these: the tokens reach them, and the
// native element stays inside where it carries the meaning (a checkbox, a search field, a file field).
export { ChoiceChips, Select, SettingRow, type SelectOption } from "./select";
export { Checkbox, RadioGroup, Switch, type RadioOption } from "./toggle";
export { SearchField, Suggestions } from "./search";
export { Disclosure } from "./disclosure";
export { FileDrop } from "./fileDrop";
export { PhoneField, PasswordField, TextArea, TextField, groupPhone } from "./fields";
export { DateField, DateRange, formatDay, type IsoDay } from "./date";
