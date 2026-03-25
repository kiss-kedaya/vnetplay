import { getJson } from "./http";

export type DashboardSummary = {
  overlayIp: string;
  relay: string;
  latency: string;
  packetLoss: string;
  activeRoom: string;
  roomMembers: number;
  supportedGames: string[];
};

const fallbackSummary: DashboardSummary = {
  overlayIp: "--",
  relay: "服务端未连接",
  latency: "--",
  packetLoss: "--",
  activeRoom: "未连接",
  roomMembers: 0,
  supportedGames: [],
};

function normalize(payload: Record<string, unknown>): DashboardSummary {
  return {
    overlayIp: String(payload.overlay_ip ?? fallbackSummary.overlayIp),
    relay: String(payload.relay ?? fallbackSummary.relay),
    latency: String(payload.latency ?? fallbackSummary.latency),
    packetLoss: String(payload.packet_loss ?? fallbackSummary.packetLoss),
    activeRoom: String(payload.active_room ?? fallbackSummary.activeRoom),
    roomMembers: Number(payload.room_members ?? fallbackSummary.roomMembers),
    supportedGames: Array.isArray(payload.supported_games)
      ? payload.supported_games.map((item) => String(item))
      : fallbackSummary.supportedGames,
  };
}

export async function fetchDashboardSummary(baseUrl?: string): Promise<DashboardSummary> {
  try {
    const payload = await getJson<Record<string, unknown>>("/api/dashboard/summary", { baseUrl });
    return normalize(payload);
  } catch {
    return fallbackSummary;
  }
}
