import { isRecord } from "@/shared/lib";
import type { NotificationReceipt } from "./types";

export function readReceipt(value: unknown): NotificationReceipt | null {
  if (!isRecord(value)) return null;
  const rawId = value.receiptId;
  if (typeof rawId !== "string" && typeof rawId !== "number") return null;
  const receiptId = String(rawId).trim();
  if (!receiptId) return null;
  return { receiptId, body: value.body };
}
