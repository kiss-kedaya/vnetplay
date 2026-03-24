export type ConnectionContext = {
  roomId: string;
  username: string;
  serverBaseUrl: string;
  success: boolean;
  detail: string;
  pid: number | null;
  source: "manual-start" | "auto-start" | "resume" | "stop" | "inspect";
  updatedAt: string;
  runtimeDurationLabel: string;
};

const storageKey = "vnetplay.runtime.last-connection-context";

const defaultContext: ConnectionContext = {
  roomId: "未连接",
  username: "player",
  serverBaseUrl: "http://127.0.0.1:9080",
  success: false,
  detail: "尚未执行网络命令",
  pid: null,
  source: "inspect",
  updatedAt: "--",
  runtimeDurationLabel: "idle",
};

export function resolveConnectionContext(): ConnectionContext {
  if (typeof window === "undefined") {
    return defaultContext;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultContext;
  }

  try {
    return { ...defaultContext, ...(JSON.parse(raw) as Partial<ConnectionContext>) };
  } catch {
    return defaultContext;
  }
}

export function saveConnectionContext(context: ConnectionContext): ConnectionContext {
  window.localStorage.setItem(storageKey, JSON.stringify(context));
  return context;
}
