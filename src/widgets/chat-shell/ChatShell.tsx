import { useState } from "react";
import type { ChatMessage, InstanceData } from "@/entities/chat";
import type { LockBlock } from "@/features/receive-notifications";
import { ChatList } from "./ChatList";
import { Composer } from "./Composer";
import { NewChatForm } from "./NewChatForm";
import { Thread } from "./Thread";

export function ChatShell({
  data,
  selectedChatId,
  lockNote,
  sending,
  creating,
  canWrite,
  onSelect,
  onBack,
  onCreate,
  onSend,
}: {
  data: InstanceData;
  selectedChatId: string | null;
  lockNote: LockBlock | null;
  sending: boolean;
  creating: boolean;
  canWrite: boolean;
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

  return (
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
  );
}
