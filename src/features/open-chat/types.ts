import type { ChatWrite } from "@/entities/chat";
import type { InstanceRequest } from "@/shared/api";
import type { Variant, WithMessage } from "@/shared/lib";

export type OpenChatResult = Variant<"type", {
  denied: void;
  invalid: WithMessage;
  selected: { chatId: string };
  created: { chatId: string; phone: string };
  rejected: WithMessage;
  failed: WithMessage;
  aborted: void;
}>;

export type OpenChatInput = InstanceRequest &
  ChatWrite & {
    rawPhone: string;
  };
