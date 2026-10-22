import type { InstanceQuery, Variant, WithMessage } from "@/shared/lib";

export type EnableReceptionResult = Variant<"type", {
  aborted: void;
  restart: WithMessage;
  error: WithMessage;
}>;

export type EnableReceptionInput = InstanceQuery;
