import type { QueryClient } from "@tanstack/react-query";
import {
  SETTINGS_RESTART_MESSAGE,
  createGreenApi,
  describeError,
  type ApiCredentials,
} from "@/shared/api";
import { isAbortError } from "@/shared/lib";

export type EnableReceptionResult =
  | { type: "aborted" }
  | { type: "restart"; message: string }
  | { type: "error"; message: string };

export type EnableReceptionInput = {
  queryClient: QueryClient;
  credentials: ApiCredentials;
  signal: AbortSignal;
};

export async function enableReception(input: EnableReceptionInput): Promise<EnableReceptionResult> {
  const { queryClient, credentials, signal } = input;
  const api = createGreenApi(credentials);
  try {
    await api.setSettings(signal);
    if (signal.aborted) return { type: "aborted" };
    await queryClient.invalidateQueries({
      queryKey: ["instance", credentials.idInstance],
      refetchType: "none",
    });
    if (signal.aborted) return { type: "aborted" };
    return { type: "restart", message: SETTINGS_RESTART_MESSAGE };
  } catch (error) {
    if (signal.aborted || isAbortError(error)) return { type: "aborted" };
    return { type: "error", message: describeError(error) };
  }
}
