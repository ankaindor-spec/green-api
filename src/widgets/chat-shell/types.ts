import type { InstanceData } from "@/entities/chat";
import type { LockBlock } from "@/features/receive-notifications";

export type ChatShellProps = {
  data: InstanceData;
  selectedChatId: string | null;
  lockNote: LockBlock | null;
  sending: boolean;
  creating: boolean;
  canWrite: boolean;
  onSelect: (chatId: string) => void;
  onBack: () => void;
  onCreate: (phone: string) => Promise<boolean>;
  onSend: (text: string) => Promise<boolean>;
};
