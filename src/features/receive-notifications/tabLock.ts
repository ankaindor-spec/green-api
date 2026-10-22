import { notificationLockName } from "@/shared/config";
import { isAbortError, isRecord, sleep } from "@/shared/lib";
import type { LockBeat, LockHandlers } from "./types";

const HEARTBEAT_MS = 1000;
const HEARTBEAT_TTL_MS = 2500;

export async function holdNotificationLock(signal: AbortSignal, handlers: LockHandlers): Promise<void> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks) {
    await holdWebLock(locks, signal, handlers);
    return;
  }
  await holdHeartbeat(signal, handlers);
}

async function holdWebLock(locks: LockManager, signal: AbortSignal, handlers: LockHandlers): Promise<void> {
  let misses = 0;
  while (!signal.aborted) {
    let acquired = false;
    try {
      await locks.request(notificationLockName, { ifAvailable: true }, async (lock) => {
        if (signal.aborted || !lock) return;
        acquired = true;
        handlers.onHeld();
        try {
          await handlers.run(signal, () => true);
        } catch (error) {
          if (signal.aborted || isAbortError(error)) return;
          throw error;
        } finally {
          handlers.onIdle();
        }
      });
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return;
      handlers.onBlocked("unavailable");
      try {
        await sleep(2000, signal);
      } catch {
        return;
      }
      continue;
    }
    if (signal.aborted) return;
    if (!acquired) {
      misses += 1;
      if (misses >= 2) handlers.onBlocked("other-tab");
      try {
        await sleep(HEARTBEAT_MS, signal);
      } catch {
        return;
      }
      continue;
    }
    misses = 0;
    if (!signal.aborted) {
      try {
        await sleep(1000, signal);
      } catch {
        return;
      }
    }
  }
}

async function holdHeartbeat(signal: AbortSignal, handlers: LockHandlers): Promise<void> {
  const tabId = createTabId();
  const release = () => {
    try {
      const beat = readBeat();
      if (beat?.id === tabId) localStorage.removeItem(notificationLockName);
    } catch {
      // The page is going away or storage is blocked.
    }
  };
  const onLeave = () => release();
  window.addEventListener("pagehide", onLeave);

  let misses = 0;
  try {
    while (!signal.aborted) {
      let claimed = false;
      try {
        claimed = claim(tabId);
      } catch {
        handlers.onBlocked("unavailable");
        return;
      }
      if (!claimed) {
        misses += 1;
        if (misses >= 2) handlers.onBlocked("other-tab");
        try {
          await sleep(HEARTBEAT_MS, signal);
        } catch {
          return;
        }
        continue;
      }

      misses = 0;
      try {
        await sleep(80, signal);
      } catch {
        return;
      }
      if (readBeat()?.id !== tabId || !claim(tabId)) {
        misses += 1;
        if (misses >= 2) handlers.onBlocked("other-tab");
        try {
          await sleep(HEARTBEAT_MS, signal);
        } catch {
          return;
        }
        continue;
      }
      handlers.onHeld();
      const child = new AbortController();
      const onParent = () => child.abort();
      if (signal.aborted) child.abort();
      else signal.addEventListener("abort", onParent);
      const timer = window.setInterval(() => {
        if (signal.aborted) return;
        try {
          if (!claim(tabId)) {
            handlers.onBlocked("other-tab");
            child.abort();
          }
        } catch {
          handlers.onBlocked("unavailable");
          child.abort();
        }
      }, HEARTBEAT_MS);
      try {
        await handlers.run(child.signal, () => readBeat()?.id === tabId);
      } catch (error) {
        if (!child.signal.aborted && !signal.aborted && !isAbortError(error)) {
          handlers.onBlocked("unavailable");
        }
      } finally {
        window.clearInterval(timer);
        signal.removeEventListener("abort", onParent);
        release();
        handlers.onIdle();
      }
      if (signal.aborted) return;
    }
  } finally {
    window.removeEventListener("pagehide", onLeave);
    release();
  }
}

function claim(tabId: string): boolean {
  const now = Date.now();
  const beat = readBeat();
  if (beat && beat.id !== tabId && now - beat.at < HEARTBEAT_TTL_MS) return false;
  const nonce = `${now}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(notificationLockName, JSON.stringify({ id: tabId, at: now, nonce }));
  const after = readBeat();
  return after?.id === tabId && after.nonce === nonce;
}

function readBeat(): LockBeat | null {
  const raw = localStorage.getItem(notificationLockName);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.id !== "string" || typeof parsed.at !== "number") return null;
    const nonce = typeof parsed.nonce === "string" ? parsed.nonce : "";
    return { id: parsed.id, at: parsed.at, nonce };
  } catch {
    return null;
  }
}

function createTabId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
