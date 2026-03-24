export type DesktopCommandResult = {
  ok: boolean;
  detail: string;
  pid?: number | null;
};

export type DesktopIdentityResult = {
  systemUsername: string;
};

export type StartNetworkPayload = {
  roomId: string;
  username: string;
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

async function invokeOrFallback(command: string, payload?: Record<string, unknown>): Promise<DesktopCommandResult> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (invoke) {
    return invoke<DesktopCommandResult>(command, payload);
  }

  if (command === "inspect_network_command") {
    return {
      ok: true,
      detail: 'fallback invoke: Command { std: "n2n-edge" "-c" "vnetplay-room" "-l" "127.0.0.1:7777" }',
      pid: null,
    };
  }

  if (command === "start_network_command") {
    const roomId = String(payload?.payload && typeof payload.payload === "object" && "roomId" in payload.payload ? (payload.payload as { roomId?: string }).roomId ?? "vnetplay-room" : "vnetplay-room");
    const username = String(payload?.payload && typeof payload.payload === "object" && "username" in payload.payload ? (payload.payload as { username?: string }).username ?? "player" : "player");
    return {
      ok: true,
      detail: `fallback invoke: prepared to start n2n edge for user ${username} in room ${roomId}`,
      pid: 43210,
    };
  }

  return {
    ok: true,
    detail: "fallback invoke: stop requested",
    pid: null,
  };
}

export async function readSystemIdentityBridge(): Promise<DesktopIdentityResult> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (invoke) {
    return invoke<DesktopIdentityResult>("get_system_identity_command");
  }

  return {
    systemUsername: "player",
  };
}

export function inspectNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeOrFallback("inspect_network_command");
}

export function startNetworkBridge(payload: StartNetworkPayload): Promise<DesktopCommandResult> {
  return invokeOrFallback("start_network_command", {
    payload: {
      roomId: payload.roomId,
      username: payload.username,
    },
  });
}

export function stopNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeOrFallback("stop_network_command");
}
