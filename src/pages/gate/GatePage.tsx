export function GatePage({
  title,
  message,
  idInstance,
  error,
  pending,
  showEnable,
  showRecheck,
  onEnable,
  onRecheck,
  onLogout,
}: {
  title: string;
  message: string;
  idInstance: string;
  error: string | null;
  pending: boolean;
  showEnable: boolean;
  showRecheck: boolean;
  onEnable: () => void;
  onRecheck: () => void;
  onLogout: () => void;
}) {
  return (
    <main className="gate-wrap">
      <section className="card" aria-busy={pending}>
        <p className="eyebrow">Экземпляр {idInstance}</p>
        <h1>{title}</h1>
        <p className="lead">{message}</p>
        {error ? (
          <p className="banner" role="alert">
            {error}
          </p>
        ) : null}
        <div className="actions">
          {showEnable ? (
            <button className="primary" type="button" onClick={onEnable} disabled={pending}>
              {pending ? "Включаем…" : "Включить приём"}
            </button>
          ) : null}
          {showRecheck ? (
            <button className="secondary" type="button" onClick={onRecheck} disabled={pending}>
              Проверить снова
            </button>
          ) : null}
          <button className="quiet" type="button" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </section>
    </main>
  );
}
