import { isRecord, type Chat, type ChatMessage, type InstanceData, type Session } from "./types";

const SESSION_KEY = "tg-chat.session";

function dataKey(idInstance: string): string {
  return `tg-chat.data.${idInstance}`;
}

export function loadSession(storage: Storage = localStorage): Session | null {
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session, storage: Storage = localStorage): void {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage: Storage = localStorage): void {
  storage.removeItem(SESSION_KEY);
}

export function loadInstance(idInstance: string, storage: Storage = localStorage): InstanceData {
  const raw = storage.getItem(dataKey(idInstance));
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
  storage.setItem(dataKey(idInstance), JSON.stringify(data));
}

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.idInstance === "string" &&
    typeof value.apiTokenInstance === "string" &&
    typeof value.apiUrl === "string" &&
    value.idInstance.trim() !== "" &&
    value.apiTokenInstance.trim() !== ""
  );
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
