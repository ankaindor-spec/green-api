import type { InstanceData } from "@/entities/chat";
import type { LockBlock } from "@/features/receive-notifications";
import { ChatShell } from "@/widgets/chat-shell";

export function ChatPage({
  idInstance,
  data,
  selectedChatId,
  lockNote,
  actionError,
  pollError,
  sending,
  creating,
  canWrite,
  onLogout,
  onSelect,
  onBack,
  onCreate,
  onSend,
}: {
  idInstance: string;
  data: InstanceData;
  selectedChatId: string | null;
  lockNote: LockBlock | null;
  actionError: string | null;
  pollError: string | null;
  sending: boolean;
  creating: boolean;
  canWrite: boolean;
  onLogout: () => void;
  onSelect: (chatId: string) => void;
  onBack: () => void;
  onCreate: (phone: string) => Promise<boolean>;
  onSend: (text: string) => Promise<boolean>;
}) {
  const selected = data.chats.some((chat) => chat.chatId === selectedChatId);
  const lockText =
    lockNote === "other-tab"
      ? "Уведомления принимаются в другой вкладке."
      : lockNote === "unavailable"
        ? "Не удалось занять приём уведомлений в этой вкладке. Закройте другие копии чата и обновите страницу."
        : null;

  return (
    <div className={selected ? "shell show-thread" : "shell"}>
      <header className="topbar">
        <div className="topbar-title">
          <strong>Чат Telegram</strong>
          <span>Экземпляр {idInstance}</span>
        </div>
        <button className="topbar-button" type="button" onClick={onLogout}>
          Выйти
        </button>
      </header>
      {actionError ? (
        <p className="banner" role="alert">
          {actionError}
        </p>
      ) : null}
      {pollError ? (
        <p className="banner" role="alert">
          {pollError}
        </p>
      ) : null}
      {lockText ? <p className="banner notice">{lockText}</p> : null}
      <ChatShell
        data={data}
        selectedChatId={selectedChatId}
        lockNote={lockNote}
        sending={sending}
        creating={creating}
        canWrite={canWrite}
        onSelect={onSelect}
        onBack={onBack}
        onCreate={onCreate}
        onSend={onSend}
      />
    </div>
  );
}
