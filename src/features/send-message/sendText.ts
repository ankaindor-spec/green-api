import { prepareOutgoingText } from "@/entities/chat";
import { createGreenApi, describeError } from "@/shared/api";
import { isAbortError } from "@/shared/lib";
import type { SendTextInput, SendTextResult } from "./types";

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
