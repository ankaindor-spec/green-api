import type { Ok } from "@/shared/lib";

export type MessageDirection = "in" | "out";

export type Chat = {
  chatId: string;
  phone: string;
  title?: string;
};

type MessageText = {
  idMessage: string;
  chatId: string;
  text: string;
};

export type ChatMessage = MessageText & {
  direction: MessageDirection;
  timestamp: number;
};

export type IncomingText = MessageText & {
  chatName?: string;
};

export type InstanceData = {
  chats: Chat[];
  messages: ChatMessage[];
};

export type TextRejectReason = "empty" | "too-long";

export type PreparedText = Ok<{ text: string }, { reason: TextRejectReason }>;

export type ChatWrite = {
  canWrite: boolean;
  readChats: () => readonly Chat[];
  beginRequest: () => void;
};
