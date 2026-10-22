import { interpretCheckAccount } from "./checkAccount";
import { HttpFailure } from "./errors";
import { createHttp } from "./http";
import { checkAccountBody, sendMessageBody } from "./payload";
import { readReceipt } from "./receipt";
import { ENABLE_INCOMING_BODY, readReceptionSettings } from "./reception";
import type { ApiCredentials, GreenApiClient } from "./types";
import { receiveTimeoutSeconds } from "@/shared/config";
import { AppMessage, isRecord, readId } from "@/shared/lib";

export function createGreenApi(credentials: ApiCredentials): GreenApiClient {
  const http = createHttp(credentials);

  return {
    getStateInstance(signal) {
      return http.request(http.url("getStateInstance"), "GET", undefined, signal).then(({ json }) => {
        if (!isRecord(json) || typeof json.stateInstance !== "string" || !json.stateInstance) {
          throw new AppMessage("Не удалось прочитать состояние экземпляра.");
        }
        return json.stateInstance;
      });
    },

    getSettings(signal) {
      return http.request(http.url("getSettings"), "GET", undefined, signal).then(({ json }) =>
        readReceptionSettings(json),
      );
    },

    setSettings(signal) {
      return http
        .request(http.url("setSettings"), "POST", ENABLE_INCOMING_BODY, signal)
        .then(() => undefined);
    },

    checkAccount(phone, signal) {
      return http
        .request(http.url("checkAccount"), "POST", checkAccountBody(phone), signal)
        .then(({ json }) => interpretCheckAccount(json));
    },

    sendMessage(chatId, message, signal) {
      return http
        .request(http.url("sendMessage"), "POST", sendMessageBody(chatId, message), signal)
        .then(({ json }) => {
          const idMessage = isRecord(json) ? readId(json.idMessage) : "";
          if (!idMessage) throw new AppMessage("Сервер не вернул идентификатор сообщения.");
          return idMessage;
        });
    },

    receiveNotification(signal) {
      const url = `${http.url("receiveNotification")}?receiveTimeout=${receiveTimeoutSeconds}`;
      return http.request(url, "GET", undefined, signal).then(({ text, json }) => {
        if (!text.trim() || json === null) return { kind: "empty" };
        const receipt = readReceipt(json);
        if (receipt) return { kind: "notice", receiptId: receipt.receiptId, body: receipt.body };
        if (isRecord(json) && !("receiptId" in json) && !("typeWebhook" in json)) {
          return { kind: "empty" };
        }
        return { kind: "invalid" };
      });
    },

    async deleteNotification(receiptId, signal) {
      try {
        const { json } = await http.request(
          http.url("deleteNotification", receiptId),
          "DELETE",
          undefined,
          signal,
        );
        if (isRecord(json) && json.result === false) return "gone";
        return "deleted";
      } catch (error) {
        if (error instanceof HttpFailure && isMissingNotification(error)) return "gone";
        throw error;
      }
    },
  };
}

function isMissingNotification(error: HttpFailure): boolean {
  if (error.status === 404) return true;
  const raw = typeof error.body === "string" ? error.body : JSON.stringify(error.body ?? "");
  return error.status === 400 && /not found|does not exist|already deleted|unknown receipt/i.test(raw);
}
