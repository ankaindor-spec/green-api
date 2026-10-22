export type ApiCredentials = {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
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

export type ReceiveEmpty = {
  kind: "empty";
};

export type ReceiveInvalid = {
  kind: "invalid";
};

export type ReceiveNotice = NotificationReceipt & {
  kind: "notice";
};

export type ReceivePayload = ReceiveEmpty | ReceiveInvalid | ReceiveNotice;

export type DeleteNotificationResult = "deleted" | "gone";

export type ReceptionSettings = {
  webhookUrl?: unknown;
  incomingWebhook?: unknown;
};

export type CheckAccountFound = {
  ok: true;
  chatId: string;
};

export type CheckAccountMissing = {
  ok: false;
  message: string;
};

export type CheckAccountResult = CheckAccountFound | CheckAccountMissing;

export type InstanceStateCopy = {
  allowed: boolean;
  message: string;
};

export type FailureNetwork = {
  kind: "network";
};

export type FailureHttp = {
  kind: "http";
  status: number;
  body: unknown;
};

export type Failure = FailureNetwork | FailureHttp;

export type GreenApiClient = {
  getStateInstance(signal?: AbortSignal): Promise<string>;
  getSettings(signal?: AbortSignal): Promise<ReceptionSettings>;
  setSettings(signal?: AbortSignal): Promise<void>;
  checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResult>;
  sendMessage(chatId: string, message: string, signal?: AbortSignal): Promise<string>;
  receiveNotification(signal?: AbortSignal): Promise<ReceivePayload>;
  deleteNotification(receiptId: string, signal?: AbortSignal): Promise<DeleteNotificationResult>;
};
