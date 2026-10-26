import { resolveApiUrl, type ApiCredentials } from "@/shared/api";
import { clearSession, loadSession } from "./storage";
import type { Session } from "./types";

export function credentialsFromSession(session: Session): ApiCredentials {
  return {
    idInstance: session.idInstance,
    apiTokenInstance: session.apiTokenInstance,
    apiUrl: resolveApiUrl(session.idInstance, session.apiUrl),
  };
}

export function readInitialSession(): Session | null {
  try {
    const loaded = loadSession();
    if (!loaded) return null;
    resolveApiUrl(loaded.idInstance, loaded.apiUrl);
    return {
      idInstance: loaded.idInstance.trim(),
      apiTokenInstance: loaded.apiTokenInstance.trim(),
      apiUrl: loaded.apiUrl.trim(),
    };
  } catch {
    try {
      clearSession();
    } catch {
      return null;
    }
    return null;
  }
}
