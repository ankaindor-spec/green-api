import { useCallback, useEffect, useRef, useState } from "react";
import { GreenApi } from "./api/greenApi";
import { describeError } from "./api/errors";
import { receiveLoop, type PollProblem } from "./api/receiveLoop";
import { ChatScreen } from "./screens/ChatScreen";
import { GateScreen } from "./screens/GateScreen";
import { LoginScreen, type LoginInput } from "./screens/LoginScreen";
import { resolveApiUrl } from "./model/apiUrl";
import { addChat, appendOutgoing, findChatByChatId, findChatByPhone, upsertIncoming } from "./model/chats";
import { NOT_ON_TELEGRAM } from "./model/checkAccount";
import { describeInstanceState } from "./model/instanceState";
import { MESSAGE_TOO_LONG, prepareOutgoingText } from "./model/message";
import { normalizePhone } from "./model/phone";
import { describeReceptionBlock, SETTINGS_RESTART_MESSAGE } from "./model/reception";
import { clearSession, loadInstance, loadSession, saveInstance, saveSession } from "./model/storage";
import { holdNotificationLock, type LockBlock } from "./model/tabLock";
import { isAbortError, sleep } from "./model/timing";
import type { ApiCredentials, InstanceData, Session } from "./model/types";

type Phase = "login" | "checking" | "gate" | "chat";
type GateKind = "state" | "settings" | "restart" | "error";
type GateView = { kind: GateKind; message: string };

const EMPTY_DATA: InstanceData = { chats: [], messages: [] };

export function App() {
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
      try {
        const api = new GreenApi(toCredentials(current));
        const started = Date.now();
        const state = await api.getStateInstance(controller.signal);
        if (controller.signal.aborted) return;
        const described = describeInstanceState(state);
        const elapsed = Date.now() - started;
        if (elapsed < 1000) await sleep(1000 - elapsed, controller.signal);
        if (controller.signal.aborted) return;
        let block: string | null = null;
        try {
          block = describeReceptionBlock(await api.getSettings(controller.signal));
        } catch (error) {
          if (controller.signal.aborted || isAbortError(error)) return;
          if (!described.allowed) {
            setGate({ kind: "state", message: described.message });
            setPhase("gate");
            return;
          }
          throw error;
        }
        if (controller.signal.aborted) return;
        if (!described.allowed) {
          setGate({ kind: "state", message: described.message });
          setPhase("gate");
          return;
        }
        if (block) {
          setGate({ kind: "settings", message: block });
          setPhase("gate");
          return;
        }
        const loaded = loadInstance(current.idInstance);
        dataRef.current = loaded;
        setData(loaded);
        setSelectedChatId((chatId) =>
          chatId && loaded.chats.some((chat) => chat.chatId === chatId) ? chatId : null,
        );
        setActionError(null);
        setPhase("chat");
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        setGate({ kind: "error", message: describeError(error) });
        setPhase("gate");
      }
    })();
    return () => controller.abort();
  }, [session, attempt]);

  useEffect(() => {
    if (phase !== "chat" || !session) return;
    const controller = new AbortController();
    const api = new GreenApi(toCredentials(session));
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
      const api = new GreenApi(toCredentials(session));
      await api.setSettings(controller.signal);
      if (controller.signal.aborted) return;
      setGate({ kind: "restart", message: SETTINGS_RESTART_MESSAGE });
      setPhase("gate");
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return;
      setActionError(describeError(error));
    } finally {
      if (!controller.signal.aborted) setPendingSettings(false);
    }
  }

  async function createChat(rawPhone: string): Promise<boolean> {
    if (!session || creatingRef.current) return false;
    if (!canWriteRef.current) {
      setActionError("Пишите из вкладки, которая принимает уведомления.");
      return false;
    }
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      setActionError("Введите номер в международном формате: от 8 до 15 цифр, без плюса и без нуля в начале.");
      return false;
    }
    const existing = findChatByPhone(dataRef.current.chats, phone);
    if (existing) {
      setSelectedChatId(existing.chatId);
      setActionError(null);
      return true;
    }
    const controller = new AbortController();
    actionAbort.current = controller;
    creatingRef.current = true;
    setCreating(true);
    try {
      const api = new GreenApi(toCredentials(session));
      const result = await api.checkAccount(phone, controller.signal);
      if (controller.signal.aborted) return false;
      if (!result.ok) {
        setActionError(result.message || NOT_ON_TELEGRAM);
        return false;
      }
      const saved = findChatByChatId(dataRef.current.chats, result.chatId);
      if (saved) {
        setSelectedChatId(saved.chatId);
        setActionError(null);
        return true;
      }
      commitData((prev) => addChat(prev, { chatId: result.chatId, phone }));
      setSelectedChatId(result.chatId);
      setActionError(null);
      return true;
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return false;
      setActionError(describeError(error));
      return false;
    } finally {
      creatingRef.current = false;
      if (!controller.signal.aborted) setCreating(false);
    }
  }

  async function sendMessage(text: string): Promise<boolean> {
    if (!session || !selectedChatId) return false;
    if (!canWriteRef.current) {
      setActionError("Пишите из вкладки, которая принимает уведомления.");
      return false;
    }
    const prepared = prepareOutgoingText(text);
    if (!prepared.ok) {
      if (prepared.reason === "too-long") setActionError(MESSAGE_TOO_LONG);
      return false;
    }
    const chat = dataRef.current.chats.find((item) => item.chatId === selectedChatId);
    if (!chat) return false;
    const controller = new AbortController();
    actionAbort.current = controller;
    setSending(true);
    try {
      const api = new GreenApi(toCredentials(session));
      const idMessage = await api.sendMessage(chat.chatId, prepared.text, controller.signal);
      if (controller.signal.aborted) return false;
      commitData((prev) =>
        appendOutgoing(prev, {
          idMessage,
          chatId: chat.chatId,
          text: prepared.text,
          direction: "out",
          timestamp: Date.now(),
        }),
      );
      setActionError(null);
      return true;
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return false;
      setActionError(describeError(error));
      return false;
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  if (!session || phase === "login") {
    return (
      <div className="app-frame">
        <LoginScreen error={loginError} onSubmit={submitLogin} />
      </div>
    );
  }

  if (phase === "checking" || (phase === "gate" && !gate)) {
    return (
      <div className="app-frame">
        <GateScreen
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
        <GateScreen
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
      <ChatScreen
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

function toCredentials(session: Session): ApiCredentials {
  return {
    idInstance: session.idInstance,
    apiTokenInstance: session.apiTokenInstance,
    apiUrl: resolveApiUrl(session.idInstance, session.apiUrl),
  };
}

function readInitialSession(): Session | null {
  try {
    const loaded = loadSession();
    if (!loaded) return null;
    resolveApiUrl(loaded.idInstance, loaded.apiUrl);
    return {
      idInstance: loaded.idInstance.trim(),
      apiTokenInstance: loaded.apiTokenInstance.trim(),
      apiUrl: loaded.apiUrl.trim(),
    };
  } catch {
    try {
      clearSession();
    } catch {
      return null;
    }
    return null;
  }
}
