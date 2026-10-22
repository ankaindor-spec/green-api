import type { PreparedText } from "./types";

export const MAX_MESSAGE_LENGTH = 4096;
export const MESSAGE_TOO_LONG = "Сообщение длиннее 4096 символов.";

export function prepareOutgoingText(raw: string): PreparedText {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too-long" };
  return { ok: true, text };
}
