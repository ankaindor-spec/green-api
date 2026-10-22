import {
  prepareOutgoingText,
  type Chat,
  type ChatMessage,
  type TextRejectReason,
} from "@/entities/chat";
import { createGreenApi, describeError, type ApiCredentials } from "@/shared/api";
import { isAbortError } from "@/shared/lib";

export type SendTextResult =
  | { type: "denied" }
  | { type: "invalid"; reason: TextRejectReason }
  | { type: "ignored" }
  | { type: "sent"; message: ChatMessage }
  | { type: "failed"; message: string }
  | { type: "aborted" };

export type SendTextInput = {
  credentials: ApiCredentials;
  chatId: string;
  text: string;
  signal: AbortSignal;
  canWrite: boolean;
  readChats: () => readonly Chat[];
  beginRequest: () => void;
};

export async function sendText(input: SendTextInput): Promise<SendTextResult> {
  if (!input.canWrite) return { type: "denied" };
  const prepared = prepareOutgoingText(input.text);
  if (!prepared.ok) return { type: "invalid", reason: prepared.reason };
  const chat = input.readChats().find((item) => item.chatId === input.chatId);
  if (!chat) return { type: "ignored" };
  input.beginRequest();
  try {
    const api = createGreenApi(input.credentials);
    const idMessage = await api.sendMessage(chat.chatId, prepared.text, input.signal);
    if (input.signal.aborted) return { type: "aborted" };
    return {
      type: "sent",
      message: {
        idMessage,
        chatId: chat.chatId,
        text: prepared.text,
        direction: "out",
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    if (input.signal.aborted || isAbortError(error)) return { type: "aborted" };
    return { type: "failed", message: describeError(error) };
  }
}
