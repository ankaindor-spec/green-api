import { sessionStorageKey } from "@/shared/config";
import { isRecord } from "@/shared/lib";
import type { Session } from "./types";

export function loadSession(storage: Storage = localStorage): Session | null {
  const raw = storage.getItem(sessionStorageKey);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Session, storage: Storage = localStorage): void {
  storage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearSession(storage: Storage = localStorage): void {
  storage.removeItem(sessionStorageKey);
}

function isSession(value: unknown): value is Session {
  return (
    isRecord(value) &&
    typeof value.idInstance === "string" &&
    typeof value.apiTokenInstance === "string" &&
    typeof value.apiUrl === "string" &&
    value.idInstance.trim() !== "" &&
    value.apiTokenInstance.trim() !== ""
  );
}
