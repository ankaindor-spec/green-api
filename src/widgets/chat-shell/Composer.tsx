import { useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_MESSAGE_LENGTH, MESSAGE_TOO_LONG, prepareOutgoingText } from "@/entities/chat";

export function Composer({
  disabled,
  busy,
  onSend,
  placeholder,
}: {
  disabled: boolean;
  busy: boolean;
  onSend: (text: string) => Promise<boolean>;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const trimmedLength = draft.trim().length;
  const tooLong = trimmedLength > MAX_MESSAGE_LENGTH;
  const shownError = tooLong ? MESSAGE_TOO_LONG : localError;

  async function submit() {
    if (disabled || busy) return;
    const prepared = prepareOutgoingText(draft);
    if (!prepared.ok) {
      setLocalError(prepared.reason === "too-long" ? MESSAGE_TOO_LONG : null);
      return;
    }
    setLocalError(null);
    const ok = await onSend(prepared.text);
    if (ok) setDraft("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className="composer" onSubmit={onSubmit}>
      {shownError ? (
        <p className="banner" role="alert">
          {shownError}
        </p>
      ) : null}
      <div className="composer-row">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={placeholder ?? (disabled ? "Сначала выберите чат" : "Сообщение")}
          disabled={disabled || busy}
          aria-label="Текст сообщения"
        />
        <button
          className="primary"
          type="submit"
          disabled={disabled || busy || trimmedLength === 0 || tooLong}
        >
          {busy ? "Отправка…" : "Отправить"}
        </button>
      </div>
      {trimmedLength >= 3600 ? (
        <p className="counter">
          {trimmedLength}/{MAX_MESSAGE_LENGTH}
        </p>
      ) : null}
    </form>
  );
}
