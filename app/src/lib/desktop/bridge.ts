export type InspectSnapshot = {
  roomId: string;
  username: string;
  community: string;
  supernode: string;
  commandPreview: string;
  edgeState: string;
  lastCommand: string;
  runtimeStartedAt: string;
  lastStartedAt: string;
  lastStoppedAt: string;
  lastPid: number | null;
  pidAlive: boolean;
  runtimeDurationSeconds: number;
  runtimeDurationLabel: string;
};

export type DesktopCommandResult = {
  ok: boolean;
  detail: string;
  pid?: number | null;
  inspect?: InspectSnapshot | null;
};

export type DesktopIdentityResult = {
  systemUsername: string;
  machineId: string;
  machineLabel: string;
};

export type QqLoginBridgeState = {
  nickname: string;
  avatar: string;
  qqUid: string;
  loggedAt: string;
};

export type StartNetworkPayload = {
  roomId: string;
  username: string;
  community: string;
  supernode: string;
  serverBaseUrl: string;
  serverAuthToken: string;
};

export const DESKTOP_BRIDGE_UNAVAILABLE_CODE = "desktop-runtime-unavailable";

type TauriEventApi = {
  listen?: (event: string, handler: (event: { payload?: unknown }) => void) => Promise<() => void>;
  emit?: (event: string, payload?: unknown) => Promise<void>;
  emitTo?: (target: string, event: string, payload?: unknown) => Promise<void>;
};

type TauriWebviewWindowInstance = {
  once: (event: string, handler: () => void) => void;
  close: () => Promise<void>;
  label: () => Promise<string>;
};

type TauriWindowInstance = {
  close: () => Promise<void>;
  label: () => Promise<string>;
};

type TauriWebviewWindowApi = {
  WebviewWindow?: new (label: string, options: Record<string, unknown>) => TauriWebviewWindowInstance;
  getCurrentWebviewWindow?: () => TauriWebviewWindowInstance;
};

type TauriWindowApi = {
  getCurrentWindow?: () => TauriWindowInstance;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: <T = DesktopCommandResult>(command: string, payload?: Record<string, unknown>) => Promise<T>;
      };
      event?: TauriEventApi;
      shell?: {
        open?: (url: string) => Promise<void>;
      };
      webviewWindow?: TauriWebviewWindowApi;
      window?: TauriWindowApi;
    };
  }
}

function getInvoke() {
  return window.__TAURI__?.core?.invoke;
}

async function waitForInvoke(retries = 8, delayMs = 200) {
  for (let index = 0; index < retries; index += 1) {
    const invoke = getInvoke();
    if (invoke) {
      return invoke;
    }

    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
  }

  return undefined;
}

async function invokeDesktop(command: string, payload?: Record<string, unknown>): Promise<DesktopCommandResult> {
  const invoke = getInvoke();

  if (!invoke) {
    return {
      ok: false,
      detail: `${DESKTOP_BRIDGE_UNAVAILABLE_CODE}: 请在桌面版中运行 ${command}`,
      pid: null,
      inspect: null,
    };
  }

  try {
    return await invoke<DesktopCommandResult>(command, payload);
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
      pid: null,
      inspect: null,
    };
  }
}

async function invokeOptional<T>(command: string, payload?: Record<string, unknown>): Promise<T | null> {
  const invoke = await waitForInvoke();
  if (!invoke) {
    return null;
  }

  try {
    return await invoke<T>(command, payload);
  } catch {
    return null;
  }
}

export async function readSystemIdentityBridge(): Promise<DesktopIdentityResult> {
  const invoke = await waitForInvoke();

  if (invoke) {
    try {
      return await invoke<DesktopIdentityResult>("get_system_identity_command");
    } catch {
      return {
        systemUsername: "player",
        machineId: "unknown-machine",
        machineLabel: "unknown",
      };
    }
  }

  return {
    systemUsername: "player",
    machineId: "unknown-machine",
    machineLabel: "unknown",
  };
}

export function inspectNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeDesktop("inspect_network_command");
}

export function startNetworkBridge(payload: StartNetworkPayload): Promise<DesktopCommandResult> {
  return invokeDesktop("start_network_command", {
    payload: {
      roomId: payload.roomId,
      username: payload.username,
      community: payload.community,
      supernode: payload.supernode,
      serverBaseUrl: payload.serverBaseUrl,
      serverAuthToken: payload.serverAuthToken,
    },
  });
}

export function stopNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeDesktop("stop_network_command");
}

export async function closeQqLoginWindowBridge(): Promise<boolean> {
  const result = await invokeOptional<boolean>("close_qq_login_window_command");
  return result ?? false;
}

export async function saveQqLoginBridge(payload: QqLoginBridgeState): Promise<boolean> {
  const result = await invokeOptional<boolean>("save_qq_login_command", {
    payload: {
      nickname: payload.nickname,
      avatar: payload.avatar,
      qqUid: payload.qqUid,
      loggedAt: payload.loggedAt,
    },
  });
  return result ?? false;
}

export async function completeQqLoginBridge(payload: QqLoginBridgeState): Promise<boolean> {
  const result = await invokeOptional<boolean>("complete_qq_login_command", {
    payload: {
      nickname: payload.nickname,
      avatar: payload.avatar,
      qqUid: payload.qqUid,
      loggedAt: payload.loggedAt,
    },
  });
  return result ?? false;
}

export async function readQqLoginBridge(): Promise<QqLoginBridgeState | null> {
  const result = await invokeOptional<Record<string, unknown>>("read_qq_login_command");
  if (!result) {
    return null;
  }

  return {
    nickname: String(result.nickname ?? ""),
    avatar: String(result.avatar ?? ""),
    qqUid: String(result.qq_uid ?? result.qqUid ?? ""),
    loggedAt: String(result.logged_at ?? result.loggedAt ?? ""),
  };
}

export async function clearQqLoginBridge(): Promise<boolean> {
  const result = await invokeOptional<boolean>("clear_qq_login_command");
  return result ?? false;
}
