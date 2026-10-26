import { isRecord } from "@/shared/lib";
import type { ReceptionSettings } from "./types";

export const ENABLE_INCOMING_BODY = {
  webhookUrl: "",
  incomingWebhook: "yes",
} as const;

export const SETTINGS_RESTART_MESSAGE =
  "Экземпляр перезапускается. Настройки применятся в течение 5 минут.";

export function describeReceptionBlock(settings: ReceptionSettings): string | null {
  const webhook =
    typeof settings.webhookUrl === "string" ? settings.webhookUrl.trim() : "";
  const incomingOff = settings.incomingWebhook !== "yes";
  const webhookSet = webhook !== "";
  if (!webhookSet && !incomingOff) return null;
  if (webhookSet && incomingOff) {
    return "В кабинете задан адрес вебхука и выключены входящие уведомления. Очистите webhook URL, включите incomingWebhook и подождите применения настроек. Нажмите «Включить приём» или исправьте это в кабинете.";
  }
  if (webhookSet) {
    return "В кабинете задан адрес вебхука. Для HTTP API webhook URL должен быть пустым, а входящие уведомления включены. Нажмите «Включить приём» или исправьте настройки в кабинете.";
  }
  return "В кабинете выключены входящие уведомления. Включите incomingWebhook и оставьте webhook URL пустым. Нажмите «Включить приём» или исправьте настройки в кабинете.";
}

export function readReceptionSettings(body: unknown): ReceptionSettings {
  if (!isRecord(body)) return {};
  return {
    webhookUrl: body.webhookUrl,
    incomingWebhook: body.incomingWebhook,
  };
}
