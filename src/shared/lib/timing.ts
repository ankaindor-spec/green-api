import { isRecord } from "./records";

export function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function waitAbort(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export type ChildSignal = {
  signal: AbortSignal;
  dispose: () => void;
  timedOut: () => boolean;
};

export function childSignal(parent: AbortSignal, ms: number): ChildSignal {
  const controller = new AbortController();
  let timed = false;
  const timer = setTimeout(() => {
    timed = true;
    controller.abort();
  }, ms);
  const onAbort = () => controller.abort();
  if (parent.aborted) controller.abort();
  else parent.addEventListener("abort", onAbort);
  return {
    signal: controller.signal,
    timedOut: () => timed && !parent.aborted,
    dispose: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", onAbort);
    },
  };
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}
