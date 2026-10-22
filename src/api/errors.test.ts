import { describe, expect, it } from "vitest";
import { HttpFailure, NetworkFailure, describeError } from "./errors";

const CHECK_QUOTA = "Месячный лимит в 100 вызовов CheckAccount исчерпан.";
const CHAT_QUOTA =
  "Тариф «Разработчик» позволяет 3 чата в этом месяце: 10000000, 10000001, 10000002.";

describe("describeError", () => {
  it("maps 401 to an invalid token", () => {
    expect(describeError(new HttpFailure(401, { message: "unauthorized" }))).toBe(
      "Неверный токен экземпляра.",
    );
  });

  it("maps 429 to too many requests", () => {
    expect(describeError(new HttpFailure(429, {}))).toBe(
      "Слишком много запросов. Подождите и повторите попытку.",
    );
  });

  it("maps 466 CheckAccount quota, including used/total 100", () => {
    expect(
      describeError(
        new HttpFailure(466, {
          invokeStatus: {
            method: "checkAccount",
            used: 100,
            total: 100,
            status: "QUOTE_EXCEEDED",
            description:
              "Monthly quota has been exceeded. Please go to your console and change the tariff to business https://console.green-api.com",
          },
        }),
      ),
    ).toBe(CHECK_QUOTA);

    expect(
      describeError(
        new HttpFailure(466, {
          invokeStatus: { method: "other", used: "100", total: "100", status: "QUOTE_EXCEEDED" },
        }),
      ),
    ).toBe(CHECK_QUOTA);
  });

  it("maps 466 correspondents quota and keeps chat ids from the description", () => {
    expect(
      describeError(
        new HttpFailure(466, {
          correspondentsStatus: {
            method: "correspondents",
            used: 3,
            total: 3,
            status: "CORRESPONDENTS_QUOTA_EXCEEDED",
            description:
              "Monthly quota has been exceeded. You can only send or receive messages from following chats: 10000000, 10000001, 10000002. Please go to the console and change the tariff to business https://console.green-api.com",
          },
        }),
      ),
    ).toBe(CHAT_QUOTA);

    expect(
      describeError(
        new HttpFailure(466, {
          quotaData: {
            method: "correspondents",
            used: "3",
            total: "3",
            status: "CORRESPONDENTS_QUOTA_EXCEEDED",
            description: "Monthly quota has been exceeded.",
          },
        }),
      ),
    ).toBe("Тариф «Разработчик» позволяет 3 чата в этом месяце.");

    expect(
      describeError(
        new HttpFailure(466, {
          invokeStatus: { method: "checkAccount", used: 1, total: 100, status: "ok" },
          correspondentsStatus: {
            method: "correspondents",
            used: 3,
            total: 3,
            status: "CORRESPONDENTS_QUOTA_EXCEEDED",
            description:
              "You can only send or receive messages from following chats: 10000000, 10000001, 10000002.",
          },
        }),
      ),
    ).toBe(CHAT_QUOTA);
  });

  it("maps 469 to the messenger rate limit", () => {
    expect(
      describeError(new HttpFailure(469, { status: false, reason: "Rate limited by messenger" })),
    ).toBe("Мессенджер ограничил частоту запросов. Повторите попытку через несколько часов.");
  });

  it("maps a network failure", () => {
    expect(describeError(new NetworkFailure())).toBe(
      "Нет соединения с сервером. Проверьте сеть и повторите попытку.",
    );
  });

  it("maps the custom webhook url 400", () => {
    expect(
      describeError(
        new HttpFailure(400, {
          message:
            "Message cannot be received because custom webhook url is set. Go to cabinet, clear webhook url for instance: 4100000000 and wait for about 1 minute for another attempt",
        }),
      ),
    ).toBe("Приём входящих отключён: задан адрес вебхука. Очистите webhook URL в кабинете.");
  });
});
