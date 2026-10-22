export type MessageDirection = "in" | "out";

export type Chat = {
  chatId: string;
  phone: string;
  title?: string;
};

export type ChatMessage = {
  idMessage: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
};

export type InstanceData = {
  chats: Chat[];
  messages: ChatMessage[];
};

export type TextRejectReason = "empty" | "too-long";

export type AcceptedText = {
  ok: true;
  text: string;
};

export type RejectedText = {
  ok: false;
  reason: TextRejectReason;
};

export type PreparedText = AcceptedText | RejectedText;

export type IncomingText = {
  idMessage: string;
  chatId: string;
  text: string;
  chatName?: string;
};
