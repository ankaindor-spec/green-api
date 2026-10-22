export type Session = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type ApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type Chat = {
  chatId: string;
  phone: string;
  title?: string;
};

export type ChatMessage = {
  idMessage: string;
  chatId: string;
  text: string;
  direction: "in" | "out";
  timestamp: number;
};

export type InstanceData = {
  chats: Chat[];
  messages: ChatMessage[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
