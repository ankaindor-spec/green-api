import { describe, expect, it } from "vitest";
import { describeInstanceState } from "./instanceState";
import { NOT_ON_TELEGRAM, interpretCheckAccount } from "./checkAccount";

describe("interpretCheckAccount", () => {
  it("accepts an existing account and keeps chatId as a string", () => {
    expect(interpretCheckAccount({ exist: true, chatId: 10000000, phoneNumber: 79876543210 })).toEqual({
      ok: true,
      chatId: "10000000",
    });
  });

  it("rejects a missing account with the privacy message and does not invent a chat", () => {
    expect(interpretCheckAccount({ exist: false, chatId: "" })).toEqual({
      ok: false,
      message: NOT_ON_TELEGRAM,
    });
    expect(NOT_ON_TELEGRAM).toBe(
      "Этого номера нет в Telegram, или он скрыт настройками приватности.",
    );
  });

  it("reports notAuthorized instead of a missing number", () => {
    const message = describeInstanceState("notAuthorized").message;
    expect(interpretCheckAccount({ exist: false, stateInstance: "notAuthorized" })).toEqual({
      ok: false,
      message,
    });
    expect(interpretCheckAccount({ exist: false, reason: "notAuthorized" })).toEqual({
      ok: false,
      message,
    });
  });
});
