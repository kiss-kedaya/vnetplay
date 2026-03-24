import { getApiBaseUrl } from "../settings/appSettings";

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
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  latency: "32 ms",
  packetLoss: "0.2%",
  activeRoom: "sts2-night-run",
  roomMembers: 3,
  supportedGames: ["Minecraft", "Slay the Spire 2"],
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

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/dashboard/summary`);
    if (!response.ok) {
      return fallbackSummary;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return normalize(payload);
  } catch {
    return fallbackSummary;
  }
}
