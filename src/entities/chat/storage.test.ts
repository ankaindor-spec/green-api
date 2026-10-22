import { describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession } from "@/entities/session";
import { loadInstance, saveInstance } from "./storage";

function memory(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("storage", () => {
  it("keeps chats per instance and keeps history after the session is cleared", () => {
    const store = memory();
    saveSession(
      { idInstance: "4100000000", apiTokenInstance: "secret-token", apiUrl: "" },
      store,
    );
    saveInstance(
      "4100000000",
      {
        chats: [{ chatId: "10000000", phone: "79991234567" }],
        messages: [
          {
            idMessage: "m1",
            chatId: "10000000",
            text: "привет",
            direction: "in",
            timestamp: 1,
          },
        ],
      },
      store,
    );
    saveInstance(
      "1100000000",
      { chats: [{ chatId: "200", phone: "12345678" }], messages: [] },
      store,
    );

    expect(loadInstance("4100000000", store).chats.map((chat) => chat.phone)).toEqual([
      "79991234567",
    ]);
    expect(loadInstance("1100000000", store).chats.map((chat) => chat.chatId)).toEqual(["200"]);
    clearSession(store);
    expect(loadSession(store)).toBeNull();
    expect(loadInstance("4100000000", store).messages.map((message) => message.text)).toEqual([
      "привет",
    ]);
    expect(JSON.stringify(loadInstance("4100000000", store))).not.toContain("secret-token");
  });
});
