import { isRecord } from "./types";

export type IncomingText = {
  idMessage: string;
  chatId: string;
  text: string;
  chatName?: string;
};

export function readReceipt(
  value: unknown,
): { receiptId: string; body: unknown } | null {
  if (!isRecord(value)) return null;
  const rawId = value.receiptId;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const receiptId = String(rawId).trim();
  if (!receiptId) return null;
  return { receiptId, body: value.body };
}

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
  const chatId = asId(body.senderData.chatId);
  if (!chatId || !knownChatIds.has(chatId)) return null;
  const idMessage = asId(body.idMessage);
  if (!idMessage || seenMessageIds.has(idMessage)) return null;
  const chatNameRaw = body.senderData.chatName;
  const chatName =
    typeof chatNameRaw === "string" && chatNameRaw.trim() ? chatNameRaw.trim() : undefined;
  return { idMessage, chatId, text, chatName };
}

function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
