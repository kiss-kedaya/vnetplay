import type { DashboardSummary } from "../../lib/api/dashboard";

export const defaultDashboardSummary: DashboardSummary = {
  overlayIp: "--",
  relay: "服务端未连接",
  latency: "--",
  packetLoss: "--",
  activeRoom: "未连接",
  roomMembers: 0,
  supportedGames: [],
};
