export const sessionStorageKey = "tg-chat.session";

export const notificationLockName = "green-api-telegram-chat";

export const receiveTimeoutSeconds = 20;

export function instanceDataStorageKey(idInstance: string): string {
  return `tg-chat.data.${idInstance}`;
}
