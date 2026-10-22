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
