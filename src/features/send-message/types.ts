import type { ChatMessage, ChatWrite, TextRejectReason } from "@/entities/chat";
import type { InstanceRequest } from "@/shared/api";
import type { Variant, WithMessage } from "@/shared/lib";

export type SendTextResult = Variant<"type", {
  denied: void;
  invalid: { reason: TextRejectReason };
  ignored: void;
  sent: { message: ChatMessage };
  failed: WithMessage;
  aborted: void;
}>;

export type SendTextInput = InstanceRequest &
  ChatWrite & {
    chatId: string;
    text: string;
  };
