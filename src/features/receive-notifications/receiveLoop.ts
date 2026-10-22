import { incomingTextFromNotification, type IncomingText } from "@/entities/chat";
import {
  NetworkFailure,
  describeError,
  describeIncomingQuota,
  isUnauthorizedError,
  isWebhookBlockedError,
  type GreenApiClient,
  type ReceivePayload,
} from "@/shared/api";
import { childSignal, isAbortError, sleep, waitAbort } from "@/shared/lib";

const CLIENT_TIMEOUT_MS = 35_000;

export type PollProblem = {
  message: string;
  code: "webhook" | "unauthorized" | "transient";
};

export async function receiveLoop(options: {
  api: Pick<GreenApiClient, "receiveNotification" | "deleteNotification">;
  signal: AbortSignal;
  knownChatIds: () => ReadonlySet<string>;
  seenIds: () => ReadonlySet<string>;
  ownsLock?: () => boolean;
  onMessage: (message: IncomingText) => void;
  onProblem: (problem: PollProblem | null) => void;
}): Promise<void> {
  const { api, signal, knownChatIds, seenIds, ownsLock, onMessage, onProblem } = options;
  const stillOwns = () => !ownsLock || ownsLock();
  let delay = 2000;
  while (!signal.aborted && stillOwns()) {
    const started = Date.now();
    let payload: ReceivePayload | "timeout";
    try {
      payload = await withTimeout(signal, (timed) => api.receiveNotification(timed));
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return;
      const stopped = await reportAndMaybeStop(error, signal, onProblem);
      if (stopped) return;
      delay = await backoff(delay, signal);
      if (signal.aborted) return;
      continue;
    }

    if (payload === "timeout") continue;

    if (payload.kind === "invalid") {
      onProblem({ message: "Не удалось прочитать уведомление.", code: "transient" });
      delay = await backoff(delay, signal);
      if (signal.aborted) return;
      continue;
    }

    if (payload.kind === "empty") {
      onProblem(null);
      delay = 2000;
      const elapsed = Date.now() - started;
      if (elapsed < 1000) {
        try {
          await sleep(1000 - elapsed, signal);
        } catch {
          return;
        }
      }
      continue;
    }

    if (!stillOwns()) return;
    const quota = describeIncomingQuota(payload.body);
    const incoming = incomingTextFromNotification(payload.body, knownChatIds(), seenIds());
    if (incoming) onMessage(incoming);
    const deleted = await deleteUntilGone(api, payload.receiptId, signal, onProblem);
    if (deleted !== "ok" || signal.aborted) return;
    onProblem(quota ? { message: quota, code: "transient" } : null);
    delay = 2000;
  }
}

async function deleteUntilGone(
  api: Pick<GreenApiClient, "deleteNotification">,
  receiptId: string,
  signal: AbortSignal,
  onProblem: (problem: PollProblem | null) => void,
): Promise<"ok" | "stop"> {
  let delay = 1000;
  while (!signal.aborted) {
    try {
      const outcome = await withTimeout(signal, (timed) => api.deleteNotification(receiptId, timed));
      if (outcome === "timeout") {
        onProblem({ message: describeError(new NetworkFailure()), code: "transient" });
      } else {
        return "ok";
      }
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return "stop";
      const stopped = await reportAndMaybeStop(error, signal, onProblem);
      if (stopped) return "stop";
    }
    try {
      await sleep(delay, signal);
    } catch {
      return "stop";
    }
    delay = Math.min(delay * 2, 15_000);
  }
  return "stop";
}

async function withTimeout<T>(
  parent: AbortSignal,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T | "timeout"> {
  const link = childSignal(parent, CLIENT_TIMEOUT_MS);
  try {
    return await run(link.signal);
  } catch (error) {
    if (parent.aborted) throw error;
    if (link.timedOut() || isAbortError(error)) return "timeout";
    throw error;
  } finally {
    link.dispose();
  }
}

async function reportAndMaybeStop(
  error: unknown,
  signal: AbortSignal,
  onProblem: (problem: PollProblem | null) => void,
): Promise<boolean> {
  const code = isUnauthorizedError(error)
    ? "unauthorized"
    : isWebhookBlockedError(error)
      ? "webhook"
      : "transient";
  onProblem({ message: describeError(error), code });
  if (code === "transient") return false;
  await waitAbort(signal);
  return true;
}

async function backoff(delay: number, signal: AbortSignal): Promise<number> {
  try {
    await sleep(delay, signal);
  } catch {
    return delay;
  }
  return Math.min(delay * 2, 30_000);
}
