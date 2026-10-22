import type { QueryClient } from "@tanstack/react-query";
import type { InstanceData } from "@/entities/chat";
import type { ApiCredentials } from "@/shared/api";

export type ConnectGateKind = "state" | "settings" | "error";

export type ConnectAborted = {
  type: "aborted";
};

export type ConnectChat = {
  type: "chat";
  data: InstanceData;
};

export type ConnectGate = {
  type: "gate";
  kind: ConnectGateKind;
  message: string;
};

export type ConnectResult = ConnectAborted | ConnectChat | ConnectGate;

export type ConnectInput = {
  queryClient: QueryClient;
  credentials: ApiCredentials;
  signal: AbortSignal;
};
