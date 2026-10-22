import { describe, expect, it } from "vitest";
import { addChat, findChatByChatId, findChatByPhone, upsertIncoming } from "./chats";
import type { InstanceData } from "./types";

const empty: InstanceData = { chats: [], messages: [] };

describe("chat lookup", () => {
  const data: InstanceData = {
    chats: [{ chatId: "10000000", phone: "79991234567", title: "Анна" }],
    messages: [],
  };

  it("matches a phone only to that phone and a chatId only to that chat", () => {
    expect(findChatByPhone(data.chats, "79991234567")?.chatId).toBe("10000000");
    expect(findChatByChatId(data.chats, "10000000")?.phone).toBe("79991234567");
    expect(findChatByPhone(data.chats, "10000000")).toBeUndefined();
    expect(findChatByChatId(data.chats, "79991234567")).toBeUndefined();
    expect(addChat(data, { chatId: "10000000", phone: "70000000000" })).toBe(data);
    expect(addChat(data, { chatId: "20000000", phone: "10000000" }).chats).toHaveLength(2);
  });

  it("stores a chat name from an incoming text and keeps the phone", () => {
    const next = upsertIncoming(
      data,
      { idMessage: "a", chatId: "10000000", text: "да", chatName: "Василиса" },
      10,
    );
    expect(next.chats[0]).toEqual({
      chatId: "10000000",
      phone: "79991234567",
      title: "Василиса",
    });
    expect(upsertIncoming(next, { idMessage: "a", chatId: "10000000", text: "да" }, 11)).toBe(
      next,
    );
  });

  it("adds a new chat when neither phone nor chatId is saved", () => {
    expect(addChat(empty, { chatId: "42", phone: "12345678" }).chats).toHaveLength(1);
  });
});
