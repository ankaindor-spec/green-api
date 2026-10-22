export class ApiUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUrlError";
  }
}

export function resolveApiUrl(idInstance: string, apiUrl: string): string {
  const explicit = apiUrl.trim();
  if (!explicit) {
    const digits = idInstance.trim();
    if (!/^\d{4,}$/.test(digits)) {
      throw new ApiUrlError(
        "Укажите idInstance из цифр (минимум 4) или полный адрес API.",
      );
    }
    return `https://${digits.slice(0, 4)}.api.green-api.com`;
  }

  let parsed: URL;
  try {
    parsed = new URL(explicit);
  } catch {
    throw new ApiUrlError("Адрес API должен быть полным URL, начинающимся с https.");
  }
  const loopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new ApiUrlError("Адрес API должен быть полным URL, начинающимся с https.");
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}
