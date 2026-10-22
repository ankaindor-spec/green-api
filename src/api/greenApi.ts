import { HttpFailure, NetworkFailure } from "./errors";
import { interpretCheckAccount, type CheckAccountResult } from "../model/checkAccount";
import { readReceipt } from "../model/notifications";
import { AppMessage } from "../model/appMessage";
import { checkAccountBody, sendMessageBody } from "../model/payload";
import { ENABLE_INCOMING_BODY, readReceptionSettings, type ReceptionSettings } from "../model/reception";
import { isAbortError } from "../model/timing";
import { isRecord, type ApiCredentials } from "../model/types";

export type ReceivePayload =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "notice"; receiptId: string; body: unknown };

export class GreenApi {
  constructor(private readonly creds: ApiCredentials) {}

  getStateInstance(signal?: AbortSignal): Promise<string> {
    return this.request(this.url("getStateInstance"), "GET", undefined, signal).then(({ json }) => {
      if (!isRecord(json) || typeof json.stateInstance !== "string" || !json.stateInstance) {
        throw new AppMessage("Не удалось прочитать состояние экземпляра.");
      }
      return json.stateInstance;
    });
  }

  getSettings(signal?: AbortSignal): Promise<ReceptionSettings> {
    return this.request(this.url("getSettings"), "GET", undefined, signal).then(({ json }) =>
      readReceptionSettings(json),
    );
  }

  setSettings(signal?: AbortSignal): Promise<void> {
    return this.request(this.url("setSettings"), "POST", ENABLE_INCOMING_BODY, signal).then(() => undefined);
  }

  checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult> {
    return this.request(this.url("checkAccount"), "POST", checkAccountBody(phone), signal).then(({ json }) =>
      interpretCheckAccount(json),
    );
  }

  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<string> {
    return this.request(this.url("sendMessage"), "POST", sendMessageBody(chatId, message), signal).then(
      ({ json }) => {
        const idMessage = isRecord(json) ? asId(json.idMessage) : "";
        if (!idMessage) throw new AppMessage("Сервер не вернул идентификатор сообщения.");
        return idMessage;
      },
    );
  }

  receiveNotification(signal?: AbortSignal): Promise<ReceivePayload> {
    const url = `${this.url("receiveNotification")}?receiveTimeout=20`;
    return this.request(url, "GET", undefined, signal).then(({ text, json }) => {
      if (!text.trim() || json === null) return { kind: "empty" };
      const receipt = readReceipt(json);
      if (receipt) return { kind: "notice", receiptId: receipt.receiptId, body: receipt.body };
      if (isRecord(json) && !("receiptId" in json) && !("typeWebhook" in json)) {
        return { kind: "empty" };
      }
      return { kind: "invalid" };
    });
  }

  async deleteNotification(receiptId: string, signal?: AbortSignal): Promise<"deleted" | "gone"> {
    try {
      const { json } = await this.request(
        this.url("deleteNotification", receiptId),
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
  }

  private url(method: string, receiptId?: string): string {
    const id = encodeURIComponent(this.creds.idInstance);
    const token = encodeURIComponent(this.creds.apiTokenInstance);
    const root = `${this.creds.apiUrl}/waInstance${id}/${method}/${token}`;
    if (receiptId === undefined) return root;
    return `${root}/${encodeURIComponent(receiptId)}`;
  }

  private async request(
    url: string,
    method: string,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<{ text: string; json: unknown }> {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        cache: "no-store",
        credentials: "omit",
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new NetworkFailure();
    }
    const text = await response.text();
    const json = parseBody(text);
    if (!response.ok) throw new HttpFailure(response.status, json);
    return { text, json };
  }
}

function parseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

function asId(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value.trim();
}

function isMissingNotification(error: HttpFailure): boolean {
  if (error.status === 404) return true;
  const raw = typeof error.body === "string" ? error.body : JSON.stringify(error.body ?? "");
  return error.status === 400 && /not found|does not exist|already deleted|unknown receipt/i.test(raw);
}
