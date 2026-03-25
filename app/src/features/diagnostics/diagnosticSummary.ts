import type { NetworkStatus } from "../../lib/api/network";
import type { RoomItem } from "../../lib/api/rooms";
import type { DesktopCommandResult } from "../../lib/desktop/bridge";
import { hasJoinedRoom, type ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";
import { isDesktopBridgeUnavailable } from "../network/desktopPresentation";
import {
  describeActionName,
  describeActionSource,
  describeEdgeState,
  parseLatencyMs,
} from "../network/networkSummary";

export type DiagnosticsTone = "online" | "warning" | "idle";

export type DiagnosticsCheck = {
  label: string;
  value: string;
  detail: string;
  tone: DiagnosticsTone;
};

export type DiagnosticsIssue = {
  title: string;
  detail: string;
  tone: DiagnosticsTone;
};

export type DiagnosticsSummary = {
  checks: DiagnosticsCheck[];
  issues: DiagnosticsIssue[];
  syncLabel: string;
  syncTone: DiagnosticsTone;
  syncDetail: string;
};

type BuildDiagnosticsSummaryInput = {
  settings: AppSettings;
  connectionContext: ConnectionContext;
  activeServerBaseUrl: string;
  rooms: RoomItem[];
  serverHealthy: boolean;
  serverError: string;
  roomsError: string;
  inspectResult: DesktopCommandResult;
  networkStatus: NetworkStatus | null;
};

function isDesktopUnavailable(result: DesktopCommandResult): boolean {
  return isDesktopBridgeUnavailable(result.detail);
}

function hasActiveConnection(context: ConnectionContext): boolean {
  return hasJoinedRoom(context);
}

function buildSyncState(connectionContext: ConnectionContext, networkStatus: NetworkStatus | null, serverHealthy: boolean) {
  if (!serverHealthy || !networkStatus) {
    return {
      label: "无法比较",
      tone: "warning" as const,
      detail: "服务端不可达，暂不能比对。",
    };
  }

  const recentAction = networkStatus.recentAction;

  if (!recentAction.source.startsWith("desktop")) {
    return {
      label: "等待桌面同步",
      tone: "idle" as const,
      detail: `最近动作来自${describeActionSource(recentAction.source)}。`,
    };
  }

  const mismatches: string[] = [];

  if (connectionContext.roomId !== recentAction.roomId) {
    mismatches.push(`房间 ${connectionContext.roomId} / ${recentAction.roomId}`);
  }

  if ((connectionContext.pid ?? null) !== (recentAction.pid ?? null)) {
    mismatches.push(`进程号 ${connectionContext.pid ?? "未记录"} / ${recentAction.pid ?? "未记录"}`);
  }

  if (connectionContext.success !== recentAction.success) {
    mismatches.push(`状态 ${connectionContext.success ? "成功" : "失败"} / ${recentAction.success ? "成功" : "失败"}`);
  }

  if (mismatches.length === 0) {
    return {
      label: "已对齐",
      tone: "online" as const,
      detail: `已对齐${describeActionName(recentAction.action)}。`,
    };
  }

  return {
    label: "存在漂移",
    tone: "warning" as const,
    detail: `发现差异：${mismatches.join("；")}`,
  };
}

export function buildDiagnosticsSummary(input: BuildDiagnosticsSummaryInput): DiagnosticsSummary {
  const desktopUnavailable = isDesktopUnavailable(input.inspectResult);
  const inspect = input.inspectResult.inspect;
  const syncState = buildSyncState(input.connectionContext, input.networkStatus, input.serverHealthy);
  const activeServerBaseUrl = input.activeServerBaseUrl.trim();
  const preferredRoomLabel = hasJoinedRoom(input.connectionContext)
    ? input.connectionContext.roomId
    : input.settings.defaultRoomName;
  const currentRoom = input.rooms.find((room) => room.roomId === input.connectionContext.roomId);
  const onlineMembers = currentRoom?.memberDetails.filter((member) => member.presence === "online").length ?? 0;
  const latencyMs = parseLatencyMs(input.networkStatus?.latency ?? "");

  const checks: DiagnosticsCheck[] = [
    !activeServerBaseUrl
      ? {
          label: "服务器地址",
          value: "未配置",
          detail: "先填服务器地址。",
          tone: "warning",
        }
      : input.serverHealthy
        ? {
            label: "服务器连通性",
            value: "在线",
            detail: `${activeServerBaseUrl} 在线。`,
            tone: "online",
          }
        : {
            label: "服务器连通性",
            value: "不可达",
            detail: input.serverError || "服务端不可达。",
            tone: "warning",
          },
    input.serverHealthy
      ? input.rooms.length > 0
        ? {
            label: "房间快照",
            value: `${input.rooms.length} 个房间`,
            detail: `${preferredRoomLabel} 可用。`,
            tone: "online",
          }
        : {
            label: "房间快照",
            value: "房间为空",
            detail: input.roomsError || "服务器在线，但还没有房间。",
            tone: "idle",
          }
      : {
          label: "房间快照",
          value: "待读取",
          detail: input.roomsError || "等服务端连通。",
          tone: "warning",
        },
    desktopUnavailable
      ? {
          label: "桌面联机引擎",
          value: "浏览器模式",
          detail: "当前不在桌面壳里。",
          tone: "warning",
        }
      : input.inspectResult.ok
        ? {
            label: "桌面联机引擎",
            value: describeEdgeState(inspect?.edgeState ?? "idle"),
            detail: input.inspectResult.detail,
            tone: "online",
          }
        : {
            label: "桌面联机引擎",
            value: "检查失败",
            detail: input.inspectResult.detail,
            tone: "warning",
          },
    {
      label: "状态同步",
      value: syncState.label,
      detail: syncState.detail,
      tone: syncState.tone,
    },
  ];

  const issues: DiagnosticsIssue[] = [];

  if (!activeServerBaseUrl) {
    issues.push({
      title: "先补齐服务器地址",
      detail: "没有地址就只能看本地占位。",
      tone: "warning",
    });
  }

  if (activeServerBaseUrl && !input.serverHealthy) {
    issues.push({
      title: "控制服务端当前不可达",
      detail: input.serverError || `请确认 ${activeServerBaseUrl} 是否已启动并监听正确端口。`,
      tone: "warning",
    });
  }

  if (input.serverHealthy && input.rooms.length === 0) {
    issues.push({
      title: "服务器在线，但房间还是空的",
      detail: "可直接回联机页开房。",
      tone: "idle",
    });
  }

  if (desktopUnavailable) {
    issues.push({
      title: "本地桌面桥不可用",
      detail: "要启动 edge，请从 Tauri 桌面壳运行。",
      tone: "warning",
    });
  }

  if (!desktopUnavailable && !input.inspectResult.ok) {
    issues.push({
      title: "本地 inspect 没有通过",
      detail: input.inspectResult.detail,
      tone: "warning",
    });
  }

  if (hasActiveConnection(input.connectionContext) && inspect?.edgeState !== "running") {
    issues.push({
      title: "房间流程已选定，但本地网络还没跑起来",
      detail: `${input.connectionContext.roomId} 已选，但本地网络仍是 ${describeEdgeState(inspect?.edgeState ?? "idle")}。`,
      tone: "warning",
    });
  }

  if (syncState.tone === "warning") {
    issues.push({
      title: "本地与服务端状态可能不一致",
      detail: syncState.detail,
      tone: "warning",
    });
  }

  if (hasActiveConnection(input.connectionContext) && input.networkStatus?.overlayIp === "--") {
    issues.push({
      title: "服务端还没收到当前房间的实时心跳",
      detail: "本地 edge 可能已经启动，但虚拟 IP 仍为空，建议等待 5-10 秒后再刷新排障页。",
      tone: "warning",
    });
  }

  if (hasActiveConnection(input.connectionContext) && currentRoom && onlineMembers === 0) {
    issues.push({
      title: "房间成员列表里还没有在线成员",
      detail: `当前房间 ${currentRoom.roomId} 已加入，但服务端还没有把任何成员判定为在线。`,
      tone: "warning",
    });
  }

  if (latencyMs !== null && latencyMs > 140) {
    issues.push({
      title: "当前线路延迟偏高",
      detail: `最近探测延迟约为 ${input.networkStatus?.latency}，建议更换更近的 supernode 或稍后重试。`,
      tone: "warning",
    });
  }

  return {
    checks,
    issues,
    syncLabel: syncState.label,
    syncTone: syncState.tone,
    syncDetail: syncState.detail,
  };
}
