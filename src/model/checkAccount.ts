import { HttpFailure, describeError } from "../api/errors";
import { describeInstanceState } from "./instanceState";
import { isRecord } from "./types";

export const NOT_ON_TELEGRAM =
  "Этого номера нет в Telegram, или он скрыт настройками приватности.";

export type CheckAccountResult =
  | { ok: true; chatId: string }
  | { ok: false; message: string };

export function interpretCheckAccount(body: unknown): CheckAccountResult {
  if (!isRecord(body)) return { ok: false, message: NOT_ON_TELEGRAM };
  if (body.exist === true) {
    const chatId = asId(body.chatId);
    if (!chatId || chatId.includes("@")) return { ok: false, message: NOT_ON_TELEGRAM };
    return { ok: true, chatId };
  }

  const reason = typeof body.reason === "string" ? body.reason : "";
  const nested =
    isRecord(body.data) && typeof body.data.reason === "string" ? body.data.reason : "";
  const why = `${reason} ${nested}`.trim();
  const state = typeof body.stateInstance === "string" ? body.stateInstance : "";
  if (state && state !== "authorized") {
    return { ok: false, message: describeInstanceState(state).message };
  }
  if (/starting/i.test(why)) {
    return { ok: false, message: describeInstanceState("starting").message };
  }
  if (/not[\s_-]*authorized/i.test(why)) {
    return { ok: false, message: describeInstanceState("notAuthorized").message };
  }
  if (/rate limited by messenger/i.test(why)) {
    return {
      ok: false,
      message: describeError(new HttpFailure(469, { reason: "Rate limited by messenger" })),
    };
  }
  if (/rate_limit_exceeded/i.test(why)) {
    return { ok: false, message: describeError(new HttpFailure(429, {})) };
  }
  return { ok: false, message: NOT_ON_TELEGRAM };
}

function asId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value.trim();
}
