export type ConnectionContext = {
  joinedRoom: boolean;
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
  joinedRoom: false,
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

function deriveJoinedRoom(context: Partial<ConnectionContext>): boolean {
  if (typeof context.joinedRoom === "boolean") {
    return context.joinedRoom;
  }

  return Boolean(context.roomId && context.roomId !== "未连接");
}

export function hasJoinedRoom(context: ConnectionContext): boolean {
  return context.joinedRoom && context.roomId !== "未连接";
}

export function resolveConnectionContext(): ConnectionContext {
  if (typeof window === "undefined") {
    return defaultContext;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultContext;
  }

  try {
    const parsed = { ...defaultContext, ...(JSON.parse(raw) as Partial<ConnectionContext>) };
    return {
      ...parsed,
      joinedRoom: deriveJoinedRoom(parsed),
    };
  } catch {
    return defaultContext;
  }
}

export function saveConnectionContext(context: ConnectionContext): ConnectionContext {
  const normalized = {
    ...context,
    joinedRoom: deriveJoinedRoom(context),
  };

  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  return normalized;
}
