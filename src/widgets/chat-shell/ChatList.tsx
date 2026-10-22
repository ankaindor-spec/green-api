import { lastMessage, sortChats, type Chat, type ChatMessage } from "@/entities/chat";

type Props = {
  chats: readonly Chat[];
  messages: readonly ChatMessage[];
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
};

export function ChatList({ chats, messages, selectedChatId, onSelect }: Props) {
  const ordered = sortChats(chats, messages);
  if (ordered.length === 0) {
    return <p className="empty-copy">Пока нет чатов. Начните новый по номеру телефона.</p>;
  }

  return (
    <ul className="chat-scroll">
      {ordered.map((chat) => {
        const active = chat.chatId === selectedChatId;
        const recent = lastMessage(messages, chat.chatId);
        const title = chat.title && chat.title !== chat.phone ? chat.title : chat.phone;
        const preview = recent
          ? `${recent.direction === "out" ? "Вы: " : ""}${recent.text.replace(/\s+/g, " ").trim()}`
          : "Нет сообщений";
        return (
          <li key={chat.chatId}>
            <button
              type="button"
              className={active ? "chat-button active" : "chat-button"}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(chat.chatId)}
            >
              <span className="chat-title">{title}</span>
              {chat.title && chat.title !== chat.phone ? (
                <span className="chat-meta">{chat.phone}</span>
              ) : (
                <span className="chat-meta">Личный чат</span>
              )}
              <span className="chat-preview">{preview}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
