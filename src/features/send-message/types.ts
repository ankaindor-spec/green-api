import type { Chat, ChatMessage, TextRejectReason } from "@/entities/chat";
import type { ApiCredentials } from "@/shared/api";

export type SendTextDenied = {
  type: "denied";
};

export type SendTextInvalid = {
  type: "invalid";
  reason: TextRejectReason;
};

export type SendTextIgnored = {
  type: "ignored";
};

export type SendTextSent = {
  type: "sent";
  message: ChatMessage;
};

export type SendTextFailed = {
  type: "failed";
  message: string;
};

export type SendTextAborted = {
  type: "aborted";
};

export type SendTextResult =
  | SendTextDenied
  | SendTextInvalid
  | SendTextIgnored
  | SendTextSent
  | SendTextFailed
  | SendTextAborted;

export type SendTextInput = {
  credentials: ApiCredentials;
  chatId: string;
  text: string;
  signal: AbortSignal;
  canWrite: boolean;
  readChats: () => readonly Chat[];
  beginRequest: () => void;
};
