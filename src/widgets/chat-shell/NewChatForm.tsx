import { useState, type FormEvent } from "react";

type Props = {
  busy: boolean;
  disabled?: boolean;
  onCreate: (phone: string) => Promise<boolean>;
};

export function NewChatForm({ busy, disabled = false, onCreate }: Props) {
  const [phone, setPhone] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    const ok = await onCreate(phone);
    if (ok) setPhone("");
  }

  return (
    <form className="new-chat" onSubmit={(event) => void submit(event)}>
      <label className="field">
        <span>Номер телефона</span>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="off"
          placeholder="79991234567"
          spellCheck={false}
        />
        <small>Международный формат, без плюса.</small>
      </label>
      <button className="primary" type="submit" disabled={busy || disabled || phone.trim() === ""}>
        {busy ? "Проверяем…" : "Открыть"}
      </button>
    </form>
  );
}
