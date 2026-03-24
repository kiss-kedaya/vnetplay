import { getJson, postJson } from "./http";

export type RecentAction = {
  action: string;
  roomId: string;
  username: string;
  detail: string;
  success: boolean;
  updatedAt: string;
  source: string;
  pid: number | null;
};

export type NetworkStatus = {
  overlayIp: string;
  relay: string;
  routeMode: string;
  edgeState: string;
  latency: string;
  community: string;
  supernode: string;
  secretMasked: string;
  recentAction: RecentAction;
};

export type SyncRecentActionPayload = {
  action: string;
  roomId: string;
  username: string;
  detail: string;
  success: boolean;
  source: string;
  pid: number | null;
};

type RecentActionListResponse = {
  items?: Record<string, unknown>[];
};

const fallbackStatus: NetworkStatus = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  routeMode: "relay-preferred",
  edgeState: "running",
  latency: "32 ms",
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  secretMasked: "********",
  recentAction: {
    action: "idle",
    roomId: "未连接",
    username: "player",
    detail: "尚未收到服务端侧最近动作",
    success: true,
    updatedAt: "--",
    source: "server",
    pid: null,
  },
};

function mapRecentAction(payload: Record<string, unknown> | undefined): RecentAction {
  const recent = payload ?? {};

  return {
    action: String(recent.action ?? fallbackStatus.recentAction.action),
    roomId: String(recent.room_id ?? fallbackStatus.recentAction.roomId),
    username: String(recent.username ?? fallbackStatus.recentAction.username),
    detail: String(recent.detail ?? fallbackStatus.recentAction.detail),
    success: Boolean(recent.success ?? fallbackStatus.recentAction.success),
    updatedAt: String(recent.updated_at ?? fallbackStatus.recentAction.updatedAt),
    source: String(recent.source ?? fallbackStatus.recentAction.source),
    pid: recent.pid == null ? fallbackStatus.recentAction.pid : Number(recent.pid),
  };
}

export async function fetchNetworkStatus(): Promise<NetworkStatus> {
  try {
    const payload = await getJson<Record<string, unknown>>("/api/network/status");

    return {
      overlayIp: String(payload.overlay_ip ?? fallbackStatus.overlayIp),
      relay: String(payload.relay ?? fallbackStatus.relay),
      routeMode: String(payload.route_mode ?? fallbackStatus.routeMode),
      edgeState: String(payload.edge_state ?? fallbackStatus.edgeState),
      latency: String(payload.latency ?? fallbackStatus.latency),
      community: String(payload.community ?? fallbackStatus.community),
      supernode: String(payload.supernode ?? fallbackStatus.supernode),
      secretMasked: String(payload.secret_masked ?? fallbackStatus.secretMasked),
      recentAction: mapRecentAction(payload.recent_action as Record<string, unknown> | undefined),
    };
  } catch {
    return fallbackStatus;
  }
}

export async function syncRecentAction(payload: SyncRecentActionPayload): Promise<RecentAction> {
  const response = await postJson<Record<string, unknown>>("/api/network/action", {
    action: payload.action,
    room_id: payload.roomId,
    username: payload.username,
    detail: payload.detail,
    success: payload.success,
    source: payload.source,
    pid: payload.pid,
  });

  return mapRecentAction(response);
}

export async function fetchRecentActionsHistory(): Promise<RecentAction[]> {
  try {
    const response = await getJson<RecentActionListResponse>("/api/network/actions");
    return Array.isArray(response.items) ? response.items.map((item) => mapRecentAction(item)) : [];
  } catch {
    return [];
  }
}
