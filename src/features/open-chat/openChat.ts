import { findChatByChatId, findChatByPhone, normalizePhone, type Chat } from "@/entities/chat";
import { NOT_ON_TELEGRAM, createGreenApi, describeError, type ApiCredentials } from "@/shared/api";
import { isAbortError } from "@/shared/lib";

const PHONE_ERROR =
  "Введите номер в международном формате: от 8 до 15 цифр, без плюса и без нуля в начале.";

export type OpenChatResult =
  | { type: "denied" }
  | { type: "invalid"; message: string }
  | { type: "selected"; chatId: string }
  | { type: "created"; chatId: string; phone: string }
  | { type: "rejected"; message: string }
  | { type: "failed"; message: string }
  | { type: "aborted" };

export type OpenChatInput = {
  credentials: ApiCredentials;
  rawPhone: string;
  signal: AbortSignal;
  canWrite: boolean;
  readChats: () => readonly Chat[];
  beginRequest: () => void;
};

export async function openChat(input: OpenChatInput): Promise<OpenChatResult> {
  if (!input.canWrite) return { type: "denied" };
  const phone = normalizePhone(input.rawPhone);
  if (!phone) return { type: "invalid", message: PHONE_ERROR };
  const existing = findChatByPhone(input.readChats(), phone);
  if (existing) return { type: "selected", chatId: existing.chatId };
  input.beginRequest();
  try {
    const api = createGreenApi(input.credentials);
    const result = await api.checkAccount(phone, input.signal);
    if (input.signal.aborted) return { type: "aborted" };
    if (!result.ok) {
      return { type: "rejected", message: result.message || NOT_ON_TELEGRAM };
    }
    const saved = findChatByChatId(input.readChats(), result.chatId);
    if (saved) return { type: "selected", chatId: saved.chatId };
    return { type: "created", chatId: result.chatId, phone };
  } catch (error) {
    if (input.signal.aborted || isAbortError(error)) return { type: "aborted" };
    return { type: "failed", message: describeError(error) };
  }
}
