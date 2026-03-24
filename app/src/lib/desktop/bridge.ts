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

export type StartNetworkPayload = {
  roomId: string;
  username: string;
  community: string;
  supernode: string;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: <T = DesktopCommandResult>(command: string, payload?: Record<string, unknown>) => Promise<T>;
      };
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
      detail: `desktop runtime unavailable for ${command}; please run inside the Tauri desktop app`,
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
    },
  });
}

export function stopNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeDesktop("stop_network_command");
}
