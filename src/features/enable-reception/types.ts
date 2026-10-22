import type { QueryClient } from "@tanstack/react-query";
import type { ApiCredentials } from "@/shared/api";

export type EnableReceptionAborted = {
  type: "aborted";
};

export type EnableReceptionRestart = {
  type: "restart";
  message: string;
};

export type EnableReceptionError = {
  type: "error";
  message: string;
};

export type EnableReceptionResult =
  | EnableReceptionAborted
  | EnableReceptionRestart
  | EnableReceptionError;

export type EnableReceptionInput = {
  queryClient: QueryClient;
  credentials: ApiCredentials;
  signal: AbortSignal;
};
