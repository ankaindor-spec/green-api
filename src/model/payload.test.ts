import { describe, expect, it } from "vitest";
import { AppMessage } from "./appMessage";
import { checkAccountBody, sendMessageBody } from "./payload";
import { ENABLE_INCOMING_BODY } from "./reception";

describe("request bodies", () => {
  it("checks a phone as an integer and does not send force", () => {
    const body = checkAccountBody("79876543210");
    expect(body).toEqual({ phoneNumber: 79876543210 });
    expect(JSON.stringify(body)).toBe('{"phoneNumber":79876543210}');
  });

  it("sends text by the saved chatId", () => {
    expect(sendMessageBody("10000000", "привет")).toEqual({
      chatId: "10000000",
      message: "привет",
    });
    expect(() => sendMessageBody("79876543210@c.us", "привет")).toThrow(AppMessage);
  });

  it("enables incoming reception with an empty webhook and nothing else", () => {
    expect(ENABLE_INCOMING_BODY).toEqual({ webhookUrl: "", incomingWebhook: "yes" });
    expect(Object.keys(ENABLE_INCOMING_BODY)).toEqual(["webhookUrl", "incomingWebhook"]);
  });
});
