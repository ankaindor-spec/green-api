import type { QueryClient } from "@tanstack/react-query";
import { loadInstance } from "@/entities/chat";
import type { InstanceData } from "@/entities/chat";
import {
  createGreenApi,
  describeError,
  describeInstanceState,
  describeReceptionBlock,
  type ApiCredentials,
} from "@/shared/api";
import { instanceSettingsKey, instanceStateKey, isAbortError, sleep } from "@/shared/lib";

const CONNECT_GAP_MS = 1000;

export type ConnectResult =
  | { type: "aborted" }
  | { type: "chat"; data: InstanceData }
  | { type: "gate"; kind: "state" | "settings" | "error"; message: string };

export type ConnectInput = {
  queryClient: QueryClient;
  credentials: ApiCredentials;
  signal: AbortSignal;
};

export async function connectInstance(input: ConnectInput): Promise<ConnectResult> {
  const { queryClient, credentials, signal } = input;
  const api = createGreenApi(credentials);
  try {
    const started = Date.now();
    const state = await fetchFresh(queryClient, instanceStateKey(credentials.idInstance), signal, (linked) =>
      api.getStateInstance(linked),
    );
    if (signal.aborted) return { type: "aborted" };
    const described = describeInstanceState(state);
    const elapsed = Date.now() - started;
    if (elapsed < CONNECT_GAP_MS) await sleep(CONNECT_GAP_MS - elapsed, signal);
    if (signal.aborted) return { type: "aborted" };
    let block: string | null = null;
    try {
      const settings = await fetchFresh(
        queryClient,
        instanceSettingsKey(credentials.idInstance),
        signal,
        (linked) => api.getSettings(linked),
      );
      if (signal.aborted) return { type: "aborted" };
      block = describeReceptionBlock(settings);
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return { type: "aborted" };
      if (!described.allowed) {
        return { type: "gate", kind: "state", message: described.message };
      }
      throw error;
    }
    if (signal.aborted) return { type: "aborted" };
    if (!described.allowed) {
      return { type: "gate", kind: "state", message: described.message };
    }
    if (block) {
      return { type: "gate", kind: "settings", message: block };
    }
    return { type: "chat", data: loadInstance(credentials.idInstance) };
  } catch (error) {
    if (signal.aborted || isAbortError(error)) return { type: "aborted" };
    return { type: "gate", kind: "error", message: describeError(error) };
  }
}

async function fetchFresh<T>(
  queryClient: QueryClient,
  queryKey: readonly [string, string, string],
  signal: AbortSignal,
  queryFn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  await queryClient.cancelQueries({ queryKey, exact: true }, { silent: true });
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  return queryClient.fetchQuery({
    queryKey,
    staleTime: 0,
    retry: false,
    networkMode: "always",
    queryFn: ({ signal: querySignal }) => withLinkedSignal(signal, querySignal, queryFn),
  });
}

async function withLinkedSignal<T>(
  outer: AbortSignal,
  inner: AbortSignal,
  queryFn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (outer.aborted || inner.aborted) controller.abort();
  else {
    outer.addEventListener("abort", abort);
    inner.addEventListener("abort", abort);
  }
  try {
    return await queryFn(controller.signal);
  } finally {
    outer.removeEventListener("abort", abort);
    inner.removeEventListener("abort", abort);
  }
}
