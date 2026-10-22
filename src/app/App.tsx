import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MESSAGE_TOO_LONG,
  addChat,
  appendOutgoing,
  loadInstance,
  saveInstance,
  upsertIncoming,
  type InstanceData,
} from "@/entities/chat";
import {
  clearSession,
  credentialsFromSession,
  readInitialSession,
  saveSession,
  type Session,
} from "@/entities/session";
import { connectInstance } from "@/features/connect-instance";
import { enableReception as requestEnableReception } from "@/features/enable-reception";
import { openChat } from "@/features/open-chat";
import { holdNotificationLock, receiveLoop, type LockBlock, type PollProblem } from "@/features/receive-notifications";
import { sendText } from "@/features/send-message";
import { ChatPage } from "@/pages/chat";
import { GatePage } from "@/pages/gate";
import { LoginPage, type LoginInput } from "@/pages/login";
import { createGreenApi, describeError, resolveApiUrl } from "@/shared/api";
import type { GateKind, GateView, Phase } from "./types";

const EMPTY_DATA: InstanceData = { chats: [], messages: [] };
const LOCKED_WRITE = "Пишите из вкладки, которая принимает уведомления.";

export function App() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(readInitialSession);
  const [phase, setPhase] = useState<Phase>(session ? "checking" : "login");
  const [attempt, setAttempt] = useState(0);
  const [gate, setGate] = useState<GateView | null>(null);
  const [data, setData] = useState<InstanceData>(EMPTY_DATA);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [lockNote, setLockNote] = useState<LockBlock | null>(null);
  const [pendingSettings, setPendingSettings] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const enableAbort = useRef<AbortController | null>(null);
  const actionAbort = useRef<AbortController | null>(null);
  const creatingRef = useRef(false);
  const canWriteRef = useRef(false);
  const lockGeneration = useRef(0);

  const commitData = useCallback((updater: (prev: InstanceData) => InstanceData) => {
    setData(() => {
      if (!canWriteRef.current) return dataRef.current;
      const previous = dataRef.current;
      const next = updater(previous);
      dataRef.current = next;
      const current = sessionRef.current;
      if (next !== previous && current) {
        try {
          saveInstance(current.idInstance, next);
        } catch {
          queueMicrotask(() => setActionError("Не удалось сохранить историю в этом браузере."));
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setPhase("checking");
    setPollError(null);
    setLockNote(null);
    const current = session;
    void (async () => {
      const outcome = await connectInstance({
        queryClient,
        credentials: credentialsFromSession(current),
        signal: controller.signal,
      });
      if (controller.signal.aborted || outcome.type === "aborted") return;
      if (outcome.type === "chat") {
        dataRef.current = outcome.data;
        setData(outcome.data);
        setSelectedChatId((chatId) =>
          chatId && outcome.data.chats.some((chat) => chat.chatId === chatId) ? chatId : null,
        );
        setActionError(null);
        setPhase("chat");
        return;
      }
      setGate({ kind: outcome.kind, message: outcome.message });
      setPhase("gate");
    })();
    return () => controller.abort();
  }, [session, attempt, queryClient]);

  useEffect(() => {
    if (phase !== "chat" || !session) return;
    const controller = new AbortController();
    const api = createGreenApi(credentialsFromSession(session));
    const generation = ++lockGeneration.current;
    const currentLock = () => lockGeneration.current === generation;
    setLockNote(null);
    canWriteRef.current = false;
    setCanWrite(false);
    void holdNotificationLock(controller.signal, {
      onHeld: () => {
        if (!currentLock()) return;
        const loaded = loadInstance(session.idInstance);
        dataRef.current = loaded;
        setData(loaded);
        canWriteRef.current = true;
        setCanWrite(true);
        setLockNote(null);
      },
      onBlocked: (reason) => {
        if (!currentLock()) return;
        canWriteRef.current = false;
        setCanWrite(false);
        setLockNote(reason);
        actionAbort.current?.abort();
      },
      onIdle: () => {
        if (!currentLock()) return;
        canWriteRef.current = false;
        setCanWrite(false);
        actionAbort.current?.abort();
      },
      run: (signal, ownsLock) =>
        receiveLoop({
          api,
          signal,
          ownsLock,
          knownChatIds: () => new Set(dataRef.current.chats.map((chat) => chat.chatId)),
          seenIds: () => new Set(dataRef.current.messages.map((message) => message.idMessage)),
          onMessage: (incoming) => {
            commitData((prev) => upsertIncoming(prev, incoming, Date.now()));
          },
          onProblem: (problem) => applyPollProblem(problem, setPollError, setGate, setPhase),
        }),
    });
    return () => {
      if (lockGeneration.current === generation) lockGeneration.current += 1;
      canWriteRef.current = false;
      setCanWrite(false);
      controller.abort();
    };
  }, [phase, session, commitData]);

  function logout() {
    enableAbort.current?.abort();
    actionAbort.current?.abort();
    try {
      clearSession();
    } catch {
      // Leave the screen even if the browser blocked storage.
    }
    sessionRef.current = null;
    dataRef.current = EMPTY_DATA;
    setSession(null);
    setPhase("login");
    setGate(null);
    setData(EMPTY_DATA);
    setSelectedChatId(null);
    setLoginError(null);
    setActionError(null);
    setPollError(null);
    setLockNote(null);
    setPendingSettings(false);
    setSending(false);
    setCreating(false);
    creatingRef.current = false;
    canWriteRef.current = false;
    setCanWrite(false);
  }

  function submitLogin(input: LoginInput) {
    try {
      resolveApiUrl(input.idInstance, input.apiUrl);
    } catch (error) {
      setLoginError(describeError(error));
      return;
    }
    const next: Session = {
      idInstance: input.idInstance,
      apiTokenInstance: input.apiTokenInstance,
      apiUrl: input.apiUrl,
    };
    try {
      saveSession(next);
    } catch {
      setLoginError("Браузер не сохранил сессию. Проверьте, что локальное хранилище доступно.");
      return;
    }
    setLoginError(null);
    setActionError(null);
    setPhase("checking");
    setSession(next);
  }

  function recheck() {
    if (pendingSettings) return;
    setActionError(null);
    setAttempt((value) => value + 1);
  }

  async function enableReception() {
    if (!session || pendingSettings) return;
    const controller = new AbortController();
    enableAbort.current = controller;
    setPendingSettings(true);
    setActionError(null);
    try {
      const outcome = await requestEnableReception({
        queryClient,
        credentials: credentialsFromSession(session),
        signal: controller.signal,
      });
      if (controller.signal.aborted || outcome.type === "aborted") return;
      if (outcome.type === "error") {
        setActionError(outcome.message);
        return;
      }
      setGate({ kind: "restart", message: outcome.message });
      setPhase("gate");
    } finally {
      if (!controller.signal.aborted) setPendingSettings(false);
    }
  }

  async function createChat(rawPhone: string): Promise<boolean> {
    if (!session || creatingRef.current) return false;
    const controller = new AbortController();
    let started = false;
    try {
      const outcome = await openChat({
        credentials: credentialsFromSession(session),
        rawPhone,
        signal: controller.signal,
        canWrite: canWriteRef.current,
        readChats: () => dataRef.current.chats,
        beginRequest() {
          actionAbort.current = controller;
          creatingRef.current = true;
          started = true;
          setCreating(true);
        },
      });
      if (outcome.type === "aborted") return false;
      if (outcome.type === "denied") {
        setActionError(LOCKED_WRITE);
        return false;
      }
      if (outcome.type === "invalid" || outcome.type === "rejected" || outcome.type === "failed") {
        setActionError(outcome.message);
        return false;
      }
      if (outcome.type === "created") {
        commitData((prev) => addChat(prev, { chatId: outcome.chatId, phone: outcome.phone }));
      }
      setSelectedChatId(outcome.chatId);
      setActionError(null);
      return true;
    } finally {
      if (started) {
        creatingRef.current = false;
        if (!controller.signal.aborted) setCreating(false);
      }
    }
  }

  async function sendMessage(text: string): Promise<boolean> {
    if (!session || !selectedChatId) return false;
    const controller = new AbortController();
    let started = false;
    try {
      const outcome = await sendText({
        credentials: credentialsFromSession(session),
        chatId: selectedChatId,
        text,
        signal: controller.signal,
        canWrite: canWriteRef.current,
        readChats: () => dataRef.current.chats,
        beginRequest() {
          actionAbort.current = controller;
          started = true;
          setSending(true);
        },
      });
      if (outcome.type === "aborted" || outcome.type === "ignored") return false;
      if (outcome.type === "denied") {
        setActionError(LOCKED_WRITE);
        return false;
      }
      if (outcome.type === "invalid") {
        if (outcome.reason === "too-long") setActionError(MESSAGE_TOO_LONG);
        return false;
      }
      if (outcome.type === "failed") {
        setActionError(outcome.message);
        return false;
      }
      commitData((prev) => appendOutgoing(prev, outcome.message));
      setActionError(null);
      return true;
    } finally {
      if (started && !controller.signal.aborted) setSending(false);
    }
  }

  if (!session || phase === "login") {
    return (
      <div className="app-frame">
        <LoginPage error={loginError} onSubmit={submitLogin} />
      </div>
    );
  }

  if (phase === "checking" || (phase === "gate" && !gate)) {
    return (
      <div className="app-frame">
        <GatePage
          title="Подключение"
          message="Проверяем состояние экземпляра…"
          idInstance={session.idInstance}
          error={null}
          pending={false}
          showEnable={false}
          showRecheck={false}
          onEnable={() => undefined}
          onRecheck={() => undefined}
          onLogout={logout}
        />
      </div>
    );
  }

  if (phase === "gate" && gate) {
    return (
      <div className="app-frame">
        <GatePage
          title={gateTitle(gate.kind)}
          message={gate.message}
          idInstance={session.idInstance}
          error={actionError}
          pending={pendingSettings}
          showEnable={gate.kind === "settings"}
          showRecheck
          onEnable={() => void enableReception()}
          onRecheck={recheck}
          onLogout={logout}
        />
      </div>
    );
  }

  return (
    <div className="app-frame">
      <ChatPage
        idInstance={session.idInstance}
        data={data}
        selectedChatId={selectedChatId}
        lockNote={lockNote}
        actionError={actionError}
        pollError={pollError}
        sending={sending}
        creating={creating}
        canWrite={canWrite}
        onLogout={logout}
        onSelect={setSelectedChatId}
        onBack={() => setSelectedChatId(null)}
        onCreate={createChat}
        onSend={sendMessage}
      />
    </div>
  );
}

function applyPollProblem(
  problem: PollProblem | null,
  setPollError: (message: string | null) => void,
  setGate: (gate: GateView) => void,
  setPhase: (phase: Phase) => void,
) {
  if (!problem) {
    setPollError(null);
    return;
  }
  if (problem.code === "webhook") {
    setPollError(null);
    setGate({ kind: "settings", message: problem.message });
    setPhase("gate");
    return;
  }
  if (problem.code === "unauthorized") {
    setPollError(null);
    setGate({ kind: "error", message: problem.message });
    setPhase("gate");
    return;
  }
  setPollError(problem.message);
}

function gateTitle(kind: GateKind): string {
  switch (kind) {
    case "state":
      return "Чат закрыт";
    case "settings":
      return "Нужно включить приём";
    case "restart":
      return "Настройки сохраняются";
    case "error":
      return "Не удалось подключиться";
  }
}

