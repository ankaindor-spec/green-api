import { useEffect, useRef } from "react";
import type { Chat, ChatMessage } from "@/entities/chat";

const timeFormat = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

type Props = {
  chat: Chat | null;
  messages: readonly ChatMessage[];
  onBack: () => void;
};

export function Thread({ chat, messages, onBack }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [chat?.chatId, messages.length]);

  if (!chat) {
    return (
      <div className="conversation empty-thread">
        <p className="empty-copy">Выберите чат или начните новый.</p>
      </div>
    );
  }

  const title = chat.title && chat.title !== chat.phone ? chat.title : chat.phone;
  const showPhone = Boolean(chat.title && chat.title !== chat.phone);

  return (
    <section className="conversation" aria-label={title}>
      <header className="thread-head">
        <button className="back" type="button" onClick={onBack}>
          К чатам
        </button>
        <div>
          <h2>{title}</h2>
          {showPhone ? <p>{chat.phone}</p> : null}
        </div>
      </header>
      <div className="messages" ref={scrollerRef}>
        {messages.length === 0 ? (
          <p className="empty-copy">В этом чате ещё нет сообщений.</p>
        ) : (
          messages.map((message) => (
            <div key={message.idMessage} className={message.direction === "out" ? "row out" : "row in"}>
              <div className="bubble">
                <p>{message.text}</p>
                <time dateTime={new Date(message.timestamp).toISOString()}>
                  {timeFormat.format(message.timestamp)}
                </time>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
