import { getJson } from "./http";

export type NetworkStatus = {
  overlayIp: string;
  relay: string;
  routeMode: string;
  edgeState: string;
  latency: string;
};

const fallbackStatus: NetworkStatus = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  routeMode: "relay-preferred",
  edgeState: "running",
  latency: "32 ms",
};

export async function fetchNetworkStatus(): Promise<NetworkStatus> {
  try {
    const payload = await getJson<Record<string, unknown>>("/api/network/status");
    return {
      overlayIp: String(payload.overlay_ip ?? fallbackStatus.overlayIp),
      relay: String(payload.relay ?? fallbackStatus.relay),
      routeMode: String(payload.route_mode ?? fallbackStatus.routeMode),
      edgeState: String(payload.edge_state ?? fallbackStatus.edgeState),
      latency: String(payload.latency ?? fallbackStatus.latency),
    };
  } catch {
    return fallbackStatus;
  }
}
