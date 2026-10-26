import type { Ok, Variant, WithMessage } from "@/shared/lib/variant";

export type ApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
};

export type InstanceRequest = {
  credentials: ApiCredentials;
  signal: AbortSignal;
};

export type HttpMethod = "GET" | "POST" | "DELETE";

export type HttpResponse = {
  text: string;
  json: unknown;
};

export type HttpClient = {
  url(method: string, receiptId?: string): string;
  request(
    url: string,
    method: HttpMethod,
    body: unknown,
    signal?: AbortSignal,
  ): Promise<HttpResponse>;
};

export type CheckAccountBody = {
  phoneNumber: number;
};

export type SendMessageBody = {
  chatId: string;
  message: string;
};

export type NotificationReceipt = {
  receiptId: string;
  body: unknown;
};

export type ReceivePayload = Variant<"kind", {
  empty: void;
  invalid: void;
  notice: NotificationReceipt;
}>;

export type DeleteNotificationResult = "deleted" | "gone";

export type ReceptionSettings = {
  webhookUrl?: unknown;
  incomingWebhook?: unknown;
};

export type CheckAccountResult = Ok<{ chatId: string }>;

export type InstanceStateCopy = WithMessage & {
  allowed: boolean;
};

export type Failure = Variant<"kind", {
  network: void;
  http: { status: number; body: unknown };
}>;

export type GreenApiClient = {
  getStateInstance(signal?: AbortSignal): Promise<string>;
  getSettings(signal?: AbortSignal): Promise<ReceptionSettings>;
  setSettings(signal?: AbortSignal): Promise<void>;
  checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult>;
  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<string>;
  receiveNotification(signal?: AbortSignal): Promise<ReceivePayload>;
  deleteNotification(receiptId: string, signal?: AbortSignal): Promise<DeleteNotificationResult>;
};
