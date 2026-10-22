import type { ConnectGateKind } from "@/features/connect-instance";

export type Phase = "login" | "checking" | "gate" | "chat";

export type GateKind = ConnectGateKind | "restart";

export type GateView = {
  kind: GateKind;
  message: string;
};
