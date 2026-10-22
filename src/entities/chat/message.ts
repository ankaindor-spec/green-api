export const MAX_MESSAGE_LENGTH = 4096;
export const MESSAGE_TOO_LONG = "Сообщение длиннее 4096 символов.";

export type TextRejectReason = "empty" | "too-long";

export type PreparedText =
  | { ok: true; text: string }
  | { ok: false; reason: TextRejectReason };

export function prepareOutgoingText(raw: string): PreparedText {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "too-long" };
  return { ok: true, text };
}
