import { SETTINGS_RESTART_MESSAGE, createGreenApi, describeError } from "@/shared/api";
import { isAbortError } from "@/shared/lib";
import type { EnableReceptionInput, EnableReceptionResult } from "./types";

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
