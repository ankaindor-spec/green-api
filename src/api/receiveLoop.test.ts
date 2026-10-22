import { afterEach, describe, expect, it, vi } from "vitest";
import { receiveLoop } from "./receiveLoop";
import { GreenApi } from "./greenApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("receiveLoop", () => {
  it("deletes each notification before the next receive and keeps only saved incoming text", async () => {
    const methods: string[] = [];
    const controller = new AbortController();
    let deletes = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      methods.push(method);
      const url = String(input);
      if (method === "DELETE") {
        deletes += 1;
        return new Response(JSON.stringify({ result: true }), { status: 200 });
      }
      if (deletes >= 2) {
        controller.abort();
        return new Response("null", { status: 200 });
      }
      const body = url.includes("receiveNotification")
        ? deletes === 0
          ? {
              receiptId: 5,
              body: {
                typeWebhook: "outgoingAPIMessageReceived",
                idMessage: "out-1",
                senderData: { chatId: "10000000" },
                messageData: {
                  typeMessage: "textMessage",
                  textMessageData: { textMessage: "своё" },
                },
              },
            }
          : {
              receiptId: 6,
              body: {
                typeWebhook: "incomingMessageReceived",
                idMessage: "in-1",
                senderData: { chatId: "10000000", chatName: "Анна" },
                messageData: {
                  typeMessage: "textMessage",
                  textMessageData: { textMessage: "привет" },
                },
              },
            }
        : null;
      return new Response(JSON.stringify(body), { status: 200 });
    });

    const seen = new Set<string>(["sent-earlier"]);
    const kept: string[] = [];
    await receiveLoop({
      api: new GreenApi({
        idInstance: "4100000000",
        apiTokenInstance: "test-token",
        apiUrl: "https://4100.api.green-api.com",
      }),
      signal: controller.signal,
      knownChatIds: () => new Set(["10000000"]),
      seenIds: () => seen,
      onMessage: (message) => {
        seen.add(message.idMessage);
        kept.push(message.text);
      },
      onProblem: () => undefined,
    });

    expect(methods.slice(0, 4)).toEqual(["GET", "DELETE", "GET", "DELETE"]);
    expect(kept).toEqual(["привет"]);
  });
});
