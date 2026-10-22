import { ApiUrlError } from "../model/apiUrl";
import { AppMessage } from "../model/appMessage";
import { isRecord } from "../model/types";
import { isAbortError } from "../model/timing";

export class HttpFailure extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`HTTP ${status}`);
    this.name = "HttpFailure";
    this.status = status;
    this.body = body;
  }
}

export class NetworkFailure extends Error {
  constructor() {
    super("network");
    this.name = "NetworkFailure";
  }
}

export type Failure =
  | { kind: "network" }
  | { kind: "http"; status: number; body: unknown };

const INVALID_TOKEN = "Неверный токен экземпляра.";
const TOO_MANY = "Слишком много запросов. Подождите и повторите попытку.";
const MESSENGER_LIMIT =
  "Мессенджер ограничил частоту запросов. Повторите попытку через несколько часов.";
const NETWORK = "Нет соединения с сервером. Проверьте сеть и повторите попытку.";
const CHECK_ACCOUNT_QUOTA = "Месячный лимит в 100 вызовов CheckAccount исчерпан.";
const WEBHOOK_BLOCKED =
  "Приём входящих отключён: задан адрес вебхука. Очистите webhook URL в кабинете.";

export function describeFailure(failure: Failure): string {
  if (failure.kind === "network") return NETWORK;
  const { status, body } = failure;
  const raw = bodyText(body);
  if (status === 401) return INVALID_TOKEN;
  if (status === 429) return TOO_MANY;
  if (status === 469) return MESSENGER_LIMIT;
  if (status === 400 && /custom webhook url/i.test(raw)) return WEBHOOK_BLOCKED;
  if (status === 466) return describeQuota(body, raw);
  return `Ошибка запроса (${status}). Повторите попытку.`;
}

export function describeError(error: unknown): string {
  if (isAbortError(error)) return "";
  if (error instanceof NetworkFailure) return NETWORK;
  if (error instanceof HttpFailure) {
    return describeFailure({ kind: "http", status: error.status, body: error.body });
  }
  if (error instanceof ApiUrlError || error instanceof AppMessage) return error.message;
  return "Не удалось выполнить запрос. Повторите попытку.";
}

export function isWebhookBlockedError(error: unknown): boolean {
  return (
    error instanceof HttpFailure &&
    error.status === 400 &&
    /custom webhook url/i.test(bodyText(error.body))
  );
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof HttpFailure && error.status === 401;
}

function describeQuota(body: unknown, raw: string): string {
  if (mentionsCorrespondents(body, raw)) return correspondentsMessage(body, raw);
  if (mentionsCheckAccount(body, raw) || hasHundredQuota(body)) return CHECK_ACCOUNT_QUOTA;
  return "Превышен лимит тарифа (466).";
}

export function describeIncomingQuota(body: unknown): string | null {
  if (!isRecord(body) || body.typeWebhook !== "quotaExceeded") return null;
  return describeQuota(body, bodyText(body));
}

function correspondentsMessage(body: unknown, raw: string): string {
  const ids = extractChatIds(body, raw);
  const base = "Тариф «Разработчик» позволяет 3 чата в этом месяце";
  return ids.length ? `${base}: ${ids.join(", ")}.` : `${base}.`;
}

function hasHundredQuota(body: unknown): boolean {
  return statusObjects(body).some(
    (item) => readCount(item.used) === 100 && readCount(item.total) === 100,
  );
}

function mentionsCheckAccount(body: unknown, raw: string): boolean {
  if (statusObjects(body).some((item) => String(item.method ?? "") === "checkAccount")) return true;
  return /checkAccount/i.test(raw);
}

function mentionsCorrespondents(body: unknown, raw: string): boolean {
  if (/correspondents/i.test(raw)) return true;
  return statusObjects(body).some((item) => {
    const method = String(item.method ?? "");
    const status = String(item.status ?? "");
    return method === "correspondents" || status.includes("CORRESPONDENTS");
  });
}

function statusObjects(body: unknown): Record<string, unknown>[] {
  if (!isRecord(body)) return [];
  const found: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (!isRecord(value)) return;
    if ("used" in value || "method" in value || "status" in value) found.push(value);
    for (const nested of Object.values(value)) {
      if (isRecord(nested)) visit(nested);
    }
  };
  visit(body);
  return found;
}

function readCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function extractChatIds(body: unknown, raw: string): string[] {
  const descriptions = collectDescriptions(body);
  const blob = descriptions.length ? descriptions.join("\n") : raw;
  const match = blob.match(/(?:chats|чатов|чаты)\s*:\s*([0-9,\s-]+)/i);
  if (!match?.[1]) return [];
  const ids = match[1]
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => /^-?\d{4,}$/.test(part));
  return [...new Set(ids)];
}

function collectDescriptions(body: unknown): string[] {
  const found: string[] = [];
  const visit = (value: unknown) => {
    if (!isRecord(value)) return;
    if (typeof value.description === "string") found.push(value.description);
    for (const nested of Object.values(value)) {
      if (isRecord(nested)) visit(nested);
    }
  };
  visit(body);
  return found;
}

function bodyText(body: unknown): string {
  if (typeof body === "string") return body;
  if (body === null || body === undefined) return "";
  try {
    return JSON.stringify(body) ?? "";
  } catch {
    return "";
  }
}
