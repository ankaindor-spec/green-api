import { useState, type FormEvent } from "react";

export type LoginInput = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export function LoginScreen({
  error,
  onSubmit,
}: {
  error: string | null;
  onSubmit: (input: LoginInput) => void;
}) {
  const [idInstance, setIdInstance] = useState("");
  const [apiTokenInstance, setApiTokenInstance] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = localError ?? error;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = idInstance.trim();
    const token = apiTokenInstance.trim();
    if (!/^\d+$/.test(id)) {
      setLocalError("idInstance должен состоять из цифр.");
      return;
    }
    if (!token || /\s/.test(token)) {
      setLocalError("Укажите токен экземпляра без пробелов.");
      return;
    }
    setLocalError(null);
    onSubmit({ idInstance: id, apiTokenInstance: token, apiUrl: apiUrl.trim() });
  }

  return (
    <main className="gate-wrap">
      <form className="card" onSubmit={submit} autoComplete="off">
        <p className="eyebrow">GREEN-API</p>
        <h1>Чат Telegram</h1>
        <p className="lead">Личные сообщения через ваш экземпляр.</p>
        {visibleError ? (
          <p className="banner" role="alert">
            {visibleError}
          </p>
        ) : null}
        <label className="field">
          <span>ID экземпляра</span>
          <input
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <label className="field">
          <span>Токен экземпляра</span>
          <input
            value={apiTokenInstance}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
          />
        </label>
        <label className="field">
          <span>Адрес API</span>
          <input
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://4100.api.green-api.com"
          />
          <small>Необязательно. Если пусто, хост строится из первых четырёх цифр ID.</small>
        </label>
        <div className="actions">
          <button className="primary" type="submit">
            Войти
          </button>
        </div>
      </form>
    </main>
  );
}
