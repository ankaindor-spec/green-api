import type { IncomingText } from "@/entities/chat";
import type { GreenApiClient } from "@/shared/api";
import type { WithMessage } from "@/shared/lib";

export type PollCode = "webhook" | "unauthorized" | "transient";

export type PollProblem = WithMessage & {
  code: PollCode;
};

export type ReceiveApi = Pick<GreenApiClient, "receiveNotification" | "deleteNotification">;

export type ReportProblem = (problem: PollProblem | null) => void;

export type ReceiveLoopOptions = {
  api: ReceiveApi;
  signal: AbortSignal;
  knownChatIds: () => ReadonlySet<string>;
  seenIds: () => ReadonlySet<string>;
  ownsLock?: () => boolean;
  onMessage: (message: IncomingText) => void;
  onProblem: ReportProblem;
};

export type LockBlock = "other-tab" | "unavailable";

export type LockHandlers = {
  onHeld: () => void;
  onBlocked: (reason: LockBlock) => void;
  onIdle: () => void;
  run: (signal: AbortSignal, ownsLock: () => boolean) => Promise<void>;
};

export type LockBeat = {
  id: string;
  at: number;
  nonce: string;
};
