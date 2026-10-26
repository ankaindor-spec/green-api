export {
  addChat,
  appendOutgoing,
  findChatByChatId,
  findChatByPhone,
  lastMessage,
  sortChats,
  upsertIncoming,
} from "./chats";
export { MAX_MESSAGE_LENGTH, MESSAGE_TOO_LONG, prepareOutgoingText } from "./message";
export { incomingTextFromNotification } from "./notifications";
export { normalizePhone } from "./phone";
export { loadInstance, saveInstance } from "./storage";
export type {
  Chat,
  ChatMessage,
  ChatWrite,
  IncomingText,
  InstanceData,
  MessageDirection,
  PreparedText,
  TextRejectReason,
} from "./types";
