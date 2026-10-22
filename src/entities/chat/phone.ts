const PHONE_SEPARATORS = /[\s\-–—()]/g;

export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(PHONE_SEPARATORS, "");
  if (value.startsWith("+")) value = value.slice(1);
  if (!/^\d{8,15}$/.test(value) || value.startsWith("0")) return null;
  return value;
}
