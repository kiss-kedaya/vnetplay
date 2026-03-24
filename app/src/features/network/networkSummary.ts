import type { DashboardSummary } from "../../lib/api/dashboard";

export const defaultDashboardSummary: DashboardSummary = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  latency: "32 ms",
  packetLoss: "0.2%",
  activeRoom: "sts2-night-run",
  roomMembers: 3,
  supportedGames: ["Minecraft", "Slay the Spire 2"],
};
