import type { Chat } from "@/entities/chat";
import type { ApiCredentials } from "@/shared/api";

export type OpenChatDenied = {
  type: "denied";
};

export type OpenChatInvalid = {
  type: "invalid";
  message: string;
};

export type OpenChatSelected = {
  type: "selected";
  chatId: string;
};

export type OpenChatCreated = {
  type: "created";
  chatId: string;
  phone: string;
};

export type OpenChatRejected = {
  type: "rejected";
  message: string;
};

export type OpenChatFailed = {
  type: "failed";
  message: string;
};

export type OpenChatAborted = {
  type: "aborted";
};

export type OpenChatResult =
  | OpenChatDenied
  | OpenChatInvalid
  | OpenChatSelected
  | OpenChatCreated
  | OpenChatRejected
  | OpenChatFailed
  | OpenChatAborted;

export type OpenChatInput = {
  credentials: ApiCredentials;
  rawPhone: string;
  signal: AbortSignal;
  canWrite: boolean;
  readChats: () => readonly Chat[];
  beginRequest: () => void;
};
