import type { ReactNode } from "react";

import { CheckIcon } from "../icons";

/**
 * A box that is ticked or not. The real `<input type="checkbox">` stays inside — a screen reader, the
 * keyboard and the tests keep working — and the box a person sees is drawn from the tokens beside it.
 */
export function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  children,
}: {
  id: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="check" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="check__box" aria-hidden="true">
        <CheckIcon />
      </span>
      <span className="check__label">{children ?? label}</span>
    </label>
  );
}

/** A setting that is on or off, drawn as a track and a knob. The `<input>` inside carries the state. */
export function Switch({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: string;
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch__track" aria-hidden="true" />
      {label ? <span className="switch__label">{label}</span> : null}
    </label>
  );
}

/** One choice of a `RadioGroup`. */
export type RadioOption = { readonly value: string; readonly label: string; readonly description?: string };

/**
 * One choice out of a few, where each choice may carry a sentence of its own. `cards` draws each one as
 * a card (a reason for a refusal, a kind of payment); the plain shape is a line per choice.
 */
export function RadioGroup({
  name,
  legend,
  value,
  options,
  onChange,
  cards = false,
  disabled = false,
}: {
  name: string;
  legend?: string;
  value: string;
  options: readonly RadioOption[];
  onChange: (value: string) => void;
  cards?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset className="radios">
      {legend ? <legend className="field__label">{legend}</legend> : null}
      {options.map((option) => (
        <label key={option.value} className={cards ? "radio radio--card" : "radio"}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={disabled}
            onChange={() => onChange(option.value)}
          />
          <span className="radio__dot" aria-hidden="true" />
          <span className="radio__words">
            <span className="radio__label">{option.label}</span>
            {option.description ? <span className="radio__text">{option.description}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
