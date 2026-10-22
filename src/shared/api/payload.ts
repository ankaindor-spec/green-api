import { AppMessage } from "@/shared/lib";

export type CheckAccountBody = {
  phoneNumber: number;
};

export type SendMessageBody = {
  chatId: string;
  message: string;
};

export function checkAccountBody(phone: string): CheckAccountBody {
  const phoneNumber = Number(phone);
  if (!Number.isSafeInteger(phoneNumber)) {
    throw new AppMessage("Номер не удалось передать как целое число.");
  }
  return { phoneNumber };
}

export function sendMessageBody(chatId: string, message: string): SendMessageBody {
  if (!chatId || chatId.includes("@")) {
    throw new AppMessage("Нельзя отправить сообщение: у чата нет сохранённого chatId.");
  }
  return { chatId, message };
}
