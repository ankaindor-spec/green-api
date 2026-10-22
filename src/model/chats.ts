import type { IncomingText } from "./notifications";
import type { Chat, ChatMessage, InstanceData } from "./types";

export function findChatByPhone(chats: readonly Chat[], phone: string): Chat | undefined {
  return chats.find((chat) => chat.phone === phone);
}

export function findChatByChatId(chats: readonly Chat[], chatId: string): Chat | undefined {
  return chats.find((chat) => chat.chatId === chatId);
}

export function addChat(data: InstanceData, chat: Chat): InstanceData {
  if (findChatByPhone(data.chats, chat.phone) || findChatByChatId(data.chats, chat.chatId)) {
    return data;
  }
  return { ...data, chats: [chat, ...data.chats] };
}

export function appendOutgoing(
  data: InstanceData,
  message: ChatMessage,
): InstanceData {
  if (data.messages.some((item) => item.idMessage === message.idMessage)) return data;
  return { ...data, messages: [...data.messages, message] };
}

export function upsertIncoming(
  data: InstanceData,
  incoming: IncomingText,
  timestamp: number,
): InstanceData {
  if (data.messages.some((item) => item.idMessage === incoming.idMessage)) return data;
  if (!data.chats.some((chat) => chat.chatId === incoming.chatId)) return data;
  const messages: ChatMessage[] = [
    ...data.messages,
    {
      idMessage: incoming.idMessage,
      chatId: incoming.chatId,
      text: incoming.text,
      direction: "in",
      timestamp,
    },
  ];
  const chats = incoming.chatName
    ? data.chats.map((chat) =>
        chat.chatId === incoming.chatId ? { ...chat, title: incoming.chatName } : chat,
      )
    : data.chats;
  return { chats, messages };
}

export function sortChats(chats: readonly Chat[], messages: readonly ChatMessage[]): Chat[] {
  const last = new Map<string, number>();
  for (const message of messages) last.set(message.chatId, message.timestamp);
  return [...chats].sort((a, b) => (last.get(b.chatId) ?? 0) - (last.get(a.chatId) ?? 0));
}

export function lastMessage(
  messages: readonly ChatMessage[],
  chatId: string,
): ChatMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && message.chatId === chatId) return message;
  }
  return undefined;
}
