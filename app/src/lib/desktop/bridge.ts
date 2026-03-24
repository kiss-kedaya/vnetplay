export type DesktopCommandResult = {
  ok: boolean;
  detail: string;
  pid?: number | null;
};

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke?: (command: string, payload?: Record<string, unknown>) => Promise<DesktopCommandResult>;
      };
    };
  }
}

async function invokeOrFallback(command: string): Promise<DesktopCommandResult> {
  const invoke = window.__TAURI__?.core?.invoke;

  if (invoke) {
    return invoke(command);
  }

  if (command === "inspect_network") {
    return {
      ok: true,
      detail: 'fallback invoke: Command { std: "n2n-edge" "-c" "vnetplay-room" "-l" "127.0.0.1:7777" }',
      pid: null,
    };
  }

  if (command === "start_network") {
    return {
      ok: true,
      detail: "fallback invoke: prepared to start n2n edge",
      pid: 43210,
    };
  }

  return {
    ok: true,
    detail: "fallback invoke: stop requested",
    pid: null,
  };
}

export function inspectNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeOrFallback("inspect_network");
}

export function startNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeOrFallback("start_network");
}

export function stopNetworkBridge(): Promise<DesktopCommandResult> {
  return invokeOrFallback("stop_network");
}
