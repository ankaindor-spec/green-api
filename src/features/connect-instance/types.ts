import type { InstanceData } from "@/entities/chat";
import type { InstanceQuery, Variant, WithMessage } from "@/shared/lib";

export type ConnectGateKind = "state" | "settings" | "error";

export type ConnectResult = Variant<"type", {
  aborted: void;
  chat: { data: InstanceData };
  gate: { kind: ConnectGateKind } & WithMessage;
}>;

export type ConnectInput = InstanceQuery;
