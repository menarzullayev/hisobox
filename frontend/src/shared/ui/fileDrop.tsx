import { useRef, useState } from "react";

import { useI18n } from "../../i18n/I18nProvider";
import { FileIcon, UploadIcon, XIcon } from "../icons";

/** The size a file may have, in whole megabytes. */
const MEGABYTE = 1024 * 1024;

/**
 * A file to send: the field where one is dropped or picked. The real `<input type="file">` stays inside
 * (hidden), so the label, the keyboard and the tests reach it as before; what a person sees is the zone
 * that takes a drop and the chip that names the file once it is there.
 */
export function FileDrop({
  id,
  label,
  hint,
  accept,
  maxMegabytes = 10,
  fileName = null,
  disabled = false,
  onFile,
  onClear,
}: {
  id: string;
  label: string;
  hint?: string | undefined;
  accept?: string | undefined;
  maxMegabytes?: number;
  fileName?: string | null | undefined;
  disabled?: boolean;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const { t } = useI18n();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  const take = (file: File | undefined) => {
    if (!file || disabled) {
      return;
    }
    if (file.size > maxMegabytes * MEGABYTE) {
      return;
    }
    onFile(file);
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {fileName ? (
        <div className="filechip">
          <FileIcon />
          <span className="filechip__name">{fileName}</span>
          {onClear ? (
            <button type="button" className="filechip__x" aria-label={t("action.clear")} onClick={onClear}>
              <XIcon />
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          className={over ? "drop drop--over" : "drop"}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            take(event.dataTransfer.files[0]);
          }}
          onClick={() => input.current?.click()}
        >
          <UploadIcon />
          <span className="drop__words">{hint ?? t("file.choose")}</span>
        </button>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        className="visually-hidden"
        accept={accept}
        disabled={disabled}
        onChange={(event) => take(event.target.files?.[0])}
      />
      {hint ? <p className="field__hint">{hint}</p> : null}
    </div>
  );
}
