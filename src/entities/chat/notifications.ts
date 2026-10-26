import { isRecord, readId } from "@/shared/lib";
import type { IncomingText } from "./types";

export function incomingTextFromNotification(
  body: unknown,
  knownChatIds: ReadonlySet<string>,
  seenMessageIds: ReadonlySet<string>,
): IncomingText | null {
  if (!isRecord(body)) return null;
  if (body.typeWebhook !== "incomingMessageReceived") return null;
  if (!isRecord(body.messageData)) return null;
  if (body.messageData.typeMessage !== "textMessage") return null;
  if (!isRecord(body.messageData.textMessageData)) return null;
  const text = body.messageData.textMessageData.textMessage;
  if (typeof text !== "string") return null;
  if (!isRecord(body.senderData)) return null;
  const chatId = readId(body.senderData.chatId);
  if (!chatId || !knownChatIds.has(chatId)) return null;
  const idMessage = readId(body.idMessage);
  if (!idMessage || seenMessageIds.has(idMessage)) return null;
  const chatNameRaw = body.senderData.chatName;
  const chatName =
    typeof chatNameRaw === "string" && chatNameRaw.trim() ? chatNameRaw.trim() : undefined;
  return { idMessage, chatId, text, chatName };
}
