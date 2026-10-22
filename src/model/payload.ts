import { AppMessage } from "./appMessage";

export function checkAccountBody(phone: string): { phoneNumber: number } {
  const phoneNumber = Number(phone);
  if (!Number.isSafeInteger(phoneNumber)) {
    throw new AppMessage("Номер не удалось передать как целое число.");
  }
  return { phoneNumber };
}

export function sendMessageBody(chatId: string, message: string): { chatId: string; message: string } {
  if (!chatId || chatId.includes("@")) {
    throw new AppMessage("Нельзя отправить сообщение: у чата нет сохранённого chatId.");
  }
  return { chatId, message };
}
