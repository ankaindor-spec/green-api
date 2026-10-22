import { describe, expect, it } from "vitest";
import { MESSAGE_TOO_LONG, prepareOutgoingText } from "./message";

describe("prepareOutgoingText", () => {
  it("trims, rejects empty text, and rejects more than 4096 characters", () => {
    expect(prepareOutgoingText("  привет  ")).toEqual({ ok: true, text: "привет" });
    expect(prepareOutgoingText("   ")).toEqual({ ok: false, reason: "empty" });
    expect(prepareOutgoingText("a".repeat(4096)).ok).toBe(true);
    expect(prepareOutgoingText("a".repeat(4097))).toEqual({ ok: false, reason: "too-long" });
    expect(MESSAGE_TOO_LONG).toBe("Сообщение длиннее 4096 символов.");
  });
});
