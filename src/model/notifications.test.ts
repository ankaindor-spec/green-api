import { describe, expect, it } from "vitest";
import { incomingTextFromNotification, readReceipt } from "./notifications";

const known = new Set(["10000000"]);

function incoming(id: string, text = "Привет", typeMessage = "textMessage") {
  return {
    typeWebhook: "incomingMessageReceived",
    idMessage: id,
    senderData: { chatId: "10000000", chatName: "Василиса" },
    messageData:
      typeMessage === "textMessage"
        ? { typeMessage, textMessageData: { textMessage: text } }
        : { typeMessage },
  };
}

describe("incomingTextFromNotification", () => {
  it("keeps an incoming text for a saved chat", () => {
    const seen = new Set<string>();
    expect(incomingTextFromNotification(incoming("m1"), known, seen)).toEqual({
      idMessage: "m1",
      chatId: "10000000",
      text: "Привет",
      chatName: "Василиса",
    });
  });

  it("drops non-text incoming messages", () => {
    const seen = new Set<string>();
    expect(incomingTextFromNotification(incoming("m2", "", "imageMessage"), known, seen)).toBeNull();
    expect(
      incomingTextFromNotification(incoming("m3", "", "extendedTextMessage"), known, seen),
    ).toBeNull();
  });

  it("drops outgoing webhooks and delivery statuses", () => {
    const seen = new Set<string>();
    expect(
      incomingTextFromNotification(
        {
          typeWebhook: "outgoingAPIMessageReceived",
          idMessage: "out-1",
          senderData: { chatId: "10000000" },
          messageData: { typeMessage: "textMessage", textMessageData: { textMessage: "я" } },
        },
        known,
        seen,
      ),
    ).toBeNull();
    expect(
      incomingTextFromNotification(
        {
          typeWebhook: "outgoingMessageReceived",
          idMessage: "out-2",
          senderData: { chatId: "10000000" },
          messageData: { typeMessage: "textMessage", textMessageData: { textMessage: "я" } },
        },
        known,
        seen,
      ),
    ).toBeNull();
    expect(
      incomingTextFromNotification(
        { typeWebhook: "outgoingMessageStatus", idMessage: "out-1", status: "delivered" },
        known,
        seen,
      ),
    ).toBeNull();
  });

  it("dedupes by idMessage, including ids already stored from send", () => {
    const body = incoming("same-id");
    const seen = new Set<string>();
    const first = incomingTextFromNotification(body, known, seen);
    expect(first?.idMessage).toBe("same-id");
    seen.add(first!.idMessage);
    expect(incomingTextFromNotification(body, known, seen)).toBeNull();

    const alreadySent = new Set(["from-send"]);
    expect(incomingTextFromNotification(incoming("from-send"), known, alreadySent)).toBeNull();
  });

  it("ignores a text message for an unknown chat", () => {
    expect(
      incomingTextFromNotification(incoming("m9"), new Set(["999"]), new Set()),
    ).toBeNull();
  });
});

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
