export type InstanceStateCopy = {
  allowed: boolean;
  message: string;
};

export function describeInstanceState(state: string): InstanceStateCopy {
  switch (state) {
    case "authorized":
      return { allowed: true, message: "Экземпляр авторизован." };
    case "notAuthorized":
      return {
        allowed: false,
        message:
          "Экземпляр не авторизован или ожидает код подтверждения. Завершите вход в кабинете. Чат закрыт.",
      };
    case "blocked":
      return { allowed: false, message: "Экземпляр заблокирован. Чат закрыт." };
    case "suspended":
      return {
        allowed: false,
        message: "На экземпляр наложены временные ограничения. Чат закрыт.",
      };
    case "starting":
      return {
        allowed: false,
        message: "Экземпляр запускается. Это может занять до 5 минут. Чат закрыт.",
      };
    case "pendingPassword":
      return {
        allowed: false,
        message:
          "Нужен пароль двухфакторной защиты. Укажите его в кабинете. Чат закрыт.",
      };
    default:
      return {
        allowed: false,
        message: `Состояние: ${state}. Чат закрыт.`,
      };
  }
}
