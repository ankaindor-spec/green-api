import { instanceDataStorageKey } from "@/shared/config";
import { isRecord } from "@/shared/lib";
import type { Chat, ChatMessage, InstanceData } from "./types";

export function loadInstance(idInstance: string, storage: Storage = localStorage): InstanceData {
  const raw = storage.getItem(instanceDataStorageKey(idInstance));
  if (!raw) return { chats: [], messages: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { chats: [], messages: [] };
    const chats = Array.isArray(parsed.chats) ? parsed.chats.filter(isChat) : [];
    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isMessage) : [];
    const chatIds = new Set(chats.map((chat) => chat.chatId));
    return {
      chats,
      messages: messages.filter((message) => chatIds.has(message.chatId)),
    };
  } catch {
    return { chats: [], messages: [] };
  }
}

export function saveInstance(
  idInstance: string,
  data: InstanceData,
  storage: Storage = localStorage,
): void {
  storage.setItem(instanceDataStorageKey(idInstance), JSON.stringify(data));
}

function isChat(value: unknown): value is Chat {
  if (!isRecord(value)) return false;
  if (typeof value.chatId !== "string" || typeof value.phone !== "string") return false;
  if (!value.chatId || value.chatId.includes("@")) return false;
  const title = value.title;
  if (title !== undefined && typeof title !== "string") return false;
  return true;
}

function isMessage(value: unknown): value is ChatMessage {
  return (
    isRecord(value) &&
    typeof value.idMessage === "string" &&
    typeof value.chatId === "string" &&
    typeof value.text === "string" &&
    (value.direction === "in" || value.direction === "out") &&
    typeof value.timestamp === "number" &&
    value.idMessage !== ""
  );
}
