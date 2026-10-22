import { isAbortError, sleep } from "./timing";

export const NOTIFICATION_LOCK = "green-api-telegram-chat";

const HEARTBEAT_MS = 1000;
const HEARTBEAT_TTL_MS = 2500;

export type LockBlock = "other-tab" | "unavailable";

type Handlers = {
  onHeld: () => void;
  onBlocked: (reason: LockBlock) => void;
  onIdle: () => void;
  run: (signal: AbortSignal, ownsLock: () => boolean) => Promise<void>;
};

export async function holdNotificationLock(signal: AbortSignal, handlers: Handlers): Promise<void> {
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (locks) {
    await holdWebLock(locks, signal, handlers);
    return;
  }
  await holdHeartbeat(signal, handlers);
}

async function holdWebLock(locks: LockManager, signal: AbortSignal, handlers: Handlers): Promise<void> {
  let misses = 0;
  while (!signal.aborted) {
    let acquired = false;
    try {
      await locks.request(NOTIFICATION_LOCK, { ifAvailable: true }, async (lock) => {
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

async function holdHeartbeat(signal: AbortSignal, handlers: Handlers): Promise<void> {
  const tabId = createTabId();
  const release = () => {
    try {
      const beat = readBeat();
      if (beat?.id === tabId) localStorage.removeItem(NOTIFICATION_LOCK);
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
  localStorage.setItem(NOTIFICATION_LOCK, JSON.stringify({ id: tabId, at: now, nonce }));
  const after = readBeat();
  return after?.id === tabId && after.nonce === nonce;
}

function readBeat(): { id: string; at: number; nonce: string } | null {
  const raw = localStorage.getItem(NOTIFICATION_LOCK);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as { id?: unknown; at?: unknown; nonce?: unknown };
    if (typeof record.id !== "string" || typeof record.at !== "number") return null;
    const nonce = typeof record.nonce === "string" ? record.nonce : "";
    return { id: record.id, at: record.at, nonce };
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
