import { useState } from "react";
import { ChatList } from "../components/ChatList";
import { Composer } from "../components/Composer";
import { NewChatForm } from "../components/NewChatForm";
import { Thread } from "../components/Thread";
import type { LockBlock } from "../model/tabLock";
import type { ChatMessage, InstanceData } from "../model/types";

export function ChatScreen({
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
  const [formOpen, setFormOpen] = useState(data.chats.length === 0);
  const selected = data.chats.find((chat) => chat.chatId === selectedChatId) ?? null;
  const visible: ChatMessage[] = selected
    ? data.messages.filter((message) => message.chatId === selected.chatId)
    : [];
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
      <div className="body">
        <aside className="sidebar">
          <div className="side-head">
            <h1>Чаты</h1>
            <button className="quiet" type="button" onClick={() => setFormOpen((open) => !open)}>
              {formOpen ? "Скрыть" : "Новый чат"}
            </button>
          </div>
          {formOpen ? (
            <NewChatForm busy={creating} disabled={!canWrite} onCreate={onCreate} />
          ) : null}
          <ChatList
            chats={data.chats}
            messages={data.messages}
            selectedChatId={selectedChatId}
            onSelect={onSelect}
          />
        </aside>
        <div className="thread-column">
          <Thread chat={selected} messages={visible} onBack={onBack} />
          <Composer
            disabled={!selected || !canWrite}
            busy={sending}
            onSend={onSend}
            placeholder={
              !canWrite
                ? lockNote === "other-tab"
                  ? "Пишите из вкладки, которая принимает уведомления"
                  : "Подождите, пока эта вкладка начнёт приём"
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
