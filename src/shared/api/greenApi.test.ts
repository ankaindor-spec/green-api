import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpFailure } from "./errors";
import { createGreenApi } from "./greenApi";

const creds = {
  idInstance: "4100000000",
  apiTokenInstance: "test-token",
  apiUrl: "https://4100.api.green-api.com",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GreenApi requests", () => {
  it("builds the host from idInstance and sends only Content-Type", async () => {
    const calls = stub({ stateInstance: "authorized" });
    const api = createGreenApi(creds);
    await expect(api.getStateInstance()).resolves.toBe("authorized");
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call?.url).toBe(
      "https://4100.api.green-api.com/waInstance4100000000/getStateInstance/test-token",
    );
    expect(call?.init.method).toBe("GET");
    expect(call?.init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.stringify(call?.init.headers)).not.toContain("Authorization");
    expect(call?.init.body).toBeUndefined();
  });

  it("uses an explicit api host and checks the account without force", async () => {
    const calls = stub({ exist: true, chatId: "10000000" });
    const api = createGreenApi({ ...creds, apiUrl: "https://example.com/root" });
    await expect(api.checkAccount("79876543210")).resolves.toEqual({
      ok: true,
      chatId: "10000000",
    });
    const call = calls[0];
    expect(call?.url).toBe(
      "https://example.com/root/waInstance4100000000/checkAccount/test-token",
    );
    expect(call?.init.method).toBe("POST");
    expect(call?.init.body).toBe('{"phoneNumber":79876543210}');
    expect(call?.init.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("sends by chatId, enables reception, and long-polls notifications", async () => {
    const calls = stub({ idMessage: "abc" });
    const api = createGreenApi(creds);
    await expect(api.sendMessage("10000000", "привет")).resolves.toBe("abc");
    expect(calls[0]?.init.body).toBe('{"chatId":"10000000","message":"привет"}');

    calls.length = 0;
    vi.stubGlobal("fetch", jsonFetch({ saveSettings: true }, calls));
    await api.setSettings();
    expect(calls[0]?.url).toContain("/setSettings/test-token");
    expect(calls[0]?.init.body).toBe('{"webhookUrl":"","incomingWebhook":"yes"}');

    calls.length = 0;
    vi.stubGlobal("fetch", jsonFetch(null, calls));
    await expect(api.receiveNotification()).resolves.toEqual({ kind: "empty" });
    expect(calls[0]?.url).toBe(
      "https://4100.api.green-api.com/waInstance4100000000/receiveNotification/test-token?receiveTimeout=20",
    );
    expect(calls[0]?.init.method).toBe("GET");

    calls.length = 0;
    vi.stubGlobal("fetch", jsonFetch({ result: true }, calls));
    await expect(api.deleteNotification("15")).resolves.toBe("deleted");
    expect(calls[0]?.url).toBe(
      "https://4100.api.green-api.com/waInstance4100000000/deleteNotification/test-token/15",
    );
    expect(calls[0]?.init.method).toBe("DELETE");
  });

  it("turns HTTP 401 into an invalid-token failure", async () => {
    stub({ message: "unauthorized" }, 401);
    const api = createGreenApi(creds);
    await expect(api.getSettings()).rejects.toBeInstanceOf(HttpFailure);
  });
});

type Call = { url: string; init: RequestInit };

function stub(body: unknown, status = 200): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", jsonFetch(body, calls, status));
  return calls;
}

function jsonFetch(body: unknown, calls: Call[], status = 200) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const recordedBody =
      request == null ? init?.body : request.body == null ? undefined : await request.clone().text();
    calls.push({
      url: request?.url ?? String(input),
      init: {
        method: request?.method ?? init?.method,
        headers: headerRecord(request?.headers ?? init?.headers),
        body: recordedBody,
      },
    });
    const text = body === undefined ? "" : JSON.stringify(body);
    return new Response(text, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function headerRecord(headers: HeadersInit | undefined): Record<string, string> {
  const found = new Headers(headers);
  const record: Record<string, string> = {};
  found.forEach((value, key) => {
    record[key === "content-type" ? "Content-Type" : key] = value;
  });
  return record;
}
