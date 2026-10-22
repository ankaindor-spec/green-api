import { isRecord } from "@/shared/lib";

export function readReceipt(
  value: unknown,
): { receiptId: string; body: unknown } | null {
  if (!isRecord(value)) return null;
  const rawId = value.receiptId;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const receiptId = String(rawId).trim();
  if (!receiptId) return null;
  return { receiptId, body: value.body };
}
