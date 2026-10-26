import { describe, expect, it } from "vitest";
import { readReceipt } from "./receipt";

describe("readReceipt", () => {
  it("treats null and empty objects as having no receipt", () => {
    expect(readReceipt(null)).toBeNull();
    expect(readReceipt({})).toBeNull();
    expect(readReceipt({ receiptId: 15, body: { typeWebhook: "x" } })).toEqual({
      receiptId: "15",
      body: { typeWebhook: "x" },
    });
  });
});
