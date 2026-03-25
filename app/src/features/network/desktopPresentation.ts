import {
  DESKTOP_BRIDGE_UNAVAILABLE_CODE,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import { describeEdgeState } from "./networkSummary";

export const emptyInspectSnapshot: InspectSnapshot = {
  roomId: "未连接",
  username: "未识别",
  community: "--",
  supernode: "--",
  commandPreview: "尚未读取本地命令预览",
  edgeState: "idle",
  lastCommand: "idle",
  runtimeStartedAt: "--",
  lastStartedAt: "--",
  lastStoppedAt: "--",
  lastPid: null,
  pidAlive: false,
  runtimeDurationSeconds: 0,
  runtimeDurationLabel: "idle",
};

export function createDesktopCommandResult(detail: string, options?: {
  ok?: boolean;
  pid?: number | null;
  inspect?: InspectSnapshot | null;
}): DesktopCommandResult {
  return {
    ok: options?.ok ?? false,
    detail,
    pid: options?.pid ?? null,
    inspect: options?.inspect ?? emptyInspectSnapshot,
  };
}

export function isDesktopBridgeUnavailable(detail: string): boolean {
  return detail.includes(DESKTOP_BRIDGE_UNAVAILABLE_CODE);
}

export function desktopEngineTone(result: DesktopCommandResult, inspect: InspectSnapshot): "online" | "warning" | "idle" {
  if (!result.ok) {
    return "warning";
  }

  return inspect.edgeState === "running" ? "online" : "idle";
}

export function desktopEngineLabel(result: DesktopCommandResult, inspect: InspectSnapshot): string {
  if (!result.ok) {
    return "异常";
  }

  return inspect.edgeState === "running" ? "在线" : describeEdgeState(inspect.edgeState);
}

export function desktopEngineSnapshot(result: DesktopCommandResult, fallback: InspectSnapshot = emptyInspectSnapshot): InspectSnapshot {
  return result.inspect ?? fallback;
}
