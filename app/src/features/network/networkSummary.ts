import type { DashboardSummary } from "../../lib/api/dashboard";
import type { NetworkStatus } from "../../lib/api/network";

export type QualityTone = "online" | "warning" | "idle";

export const defaultDashboardSummary: DashboardSummary = {
  overlayIp: "--",
  relay: "服务端未连接",
  latency: "--",
  packetLoss: "--",
  activeRoom: "未连接",
  roomMembers: 0,
  supportedGames: [],
};

export function parseLatencyMs(value: string): number | null {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function displayMetric(value: string, fallback = "等待心跳"): string {
  const trimmed = value.trim();
  return !trimmed || trimmed === "--" ? fallback : trimmed;
}

export function displayProcessId(value: number | null | undefined): string {
  return value == null ? "未记录" : String(value);
}

export function describeActionName(action: string): string {
  switch (action) {
    case "idle":
      return "待机";
    case "unavailable":
      return "服务端状态不可用";
    case "desktop-start":
      return "手动启动本地网络";
    case "desktop-auto-start":
      return "自动启动本地网络";
    case "desktop-resume-start":
      return "继续联机并启动网络";
    case "desktop-stop":
      return "停止本地网络";
    case "desktop-inspect":
      return "检查本地网络";
    case "desktop-stop-room-leave":
      return "离房前停止本地网络";
    case "room-created":
      return "已创建房间";
    case "room-joined":
      return "已加入房间";
    case "room-left":
      return "已退出房间";
    case "room-leave-skipped":
      return "退出房间未命中";
    case "node-heartbeat":
      return "实时心跳上报";
    case "node-heartbeat-stop":
      return "停止心跳上报";
    case "room-snapshot":
      return "房间快照";
    default:
      return action || "未知动作";
  }
}

export function describeActionSource(source: string): string {
  switch (source) {
    case "desktop-manual":
      return "手动操作回写";
    case "desktop-auto":
      return "自动启动回写";
    case "desktop-resume":
      return "继续联机回写";
    case "desktop-room-leave":
      return "离房收尾";
    case "server-room":
      return "服务端房间记录";
    case "server-heartbeat":
      return "服务端心跳记录";
    case "fallback":
      return "本地占位数据";
    case "poll-edge":
      return "本地轮询";
    case "home-create":
      return "联机页建房";
    case "home-join":
      return "联机页进房";
    default:
      return source || "未知来源";
  }
}

export function describeDesktopCommand(command: string): string {
  switch (command) {
    case "idle":
      return "待命";
    case "start-network":
      return "启动网络";
    case "stop-network":
      return "停止网络";
    case "inspect-auto-cleanup":
      return "自动清理残留进程";
    default:
      return command || "未记录";
  }
}

export function describeRouteMode(routeMode: string): string {
  switch (routeMode) {
    case "relay-preferred":
      return "优先走中继";
    case "direct-preferred":
      return "优先直连";
    case "unknown":
    default:
      return "等待线路判定";
  }
}

export function describeEdgeState(edgeState: string): string {
  switch (edgeState) {
    case "running":
      return "运行中";
    case "stale-pid":
      return "残留进程";
    case "idle":
      return "待机";
    default:
      return edgeState || "待机";
  }
}

export function describeProcessLiveness(pidAlive: boolean): string {
  return pidAlive ? "运行中" : "未运行";
}

export function explainOverlayMetric(overlayIp: string): string {
  return overlayIp === "--"
    ? "尚未拿到虚拟网卡地址，通常说明服务端还没收到新的 heartbeat。"
    : "服务端已经识别到本机当前虚拟网络地址。";
}

export function explainLatencyMetric(latency: string): string {
  const latencyMs = parseLatencyMs(latency);
  if (latencyMs == null) {
    return "当前延迟探测还没有拿到结果。";
  }

  return `${latency} 是客户端到当前 supernode 的一次快速探测值，用来判断线路是否偏慢。`;
}

export function summarizeNetworkQuality(status: Pick<NetworkStatus, "latency" | "overlayIp" | "routeMode" | "relay">): {
  tone: QualityTone;
  label: string;
  detail: string;
  routeModeLabel: string;
} {
  if (!status.overlayIp || status.overlayIp === "--") {
    return {
      tone: "idle",
      label: "等待心跳",
      detail: "edge 可能刚启动，服务端还没收到该房间的实时网络数据。",
      routeModeLabel: describeRouteMode(status.routeMode),
    };
  }

  const latencyMs = parseLatencyMs(status.latency);
  if (latencyMs == null) {
    return {
      tone: "warning",
      label: "探测不完整",
      detail: "已拿到 overlay IP，但延迟探测暂时不可用，可稍后再检查一次。",
      routeModeLabel: describeRouteMode(status.routeMode),
    };
  }

  if (latencyMs <= 60) {
    return {
      tone: "online",
      label: "线路良好",
      detail: "当前延迟较低，适合继续联机或让其他成员直接验证游戏内联通。",
      routeModeLabel: describeRouteMode(status.routeMode),
    };
  }

  if (latencyMs <= 140) {
    return {
      tone: "online",
      label: "线路可用",
      detail: "延迟处于可接受范围，动作类游戏可能会略有波动，但大多数联机会正常。",
      routeModeLabel: describeRouteMode(status.routeMode),
    };
  }

  return {
    tone: "warning",
    label: "高延迟",
    detail: "当前线路已经可用，但延迟偏高，建议换更近的 supernode 或稍后重试。",
    routeModeLabel: describeRouteMode(status.routeMode),
  };
}
