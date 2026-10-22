import type { ConnectGateKind } from "@/features/connect-instance";
import type { WithMessage } from "@/shared/lib";

export type Phase = "login" | "checking" | "gate" | "chat";

export type GateKind = ConnectGateKind | "restart";

export type GateView = WithMessage & {
  kind: GateKind;
};
