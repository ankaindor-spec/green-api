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
  AcceptedText,
  Chat,
  ChatMessage,
  IncomingText,
  InstanceData,
  MessageDirection,
  PreparedText,
  RejectedText,
  TextRejectReason,
} from "./types";
