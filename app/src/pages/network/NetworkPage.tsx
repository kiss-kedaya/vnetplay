import { useEffect, useState } from "react";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";

const fallbackStatus: NetworkStatus = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  routeMode: "relay-preferred",
  edgeState: "running",
  latency: "32 ms",
};

export function NetworkPage() {
  const [status, setStatus] = useState<NetworkStatus>(fallbackStatus);

  useEffect(() => {
    fetchNetworkStatus().then(setStatus);
  }, []);

  return (
    <section className="card page-card">
      <div className="section-header">
        <h2>网络状态</h2>
        <p>n2n edge、supernode 路径和当前链路质量都在这里收口展示。</p>
      </div>
      <div className="key-value-grid">
        <div><strong>虚拟 IP</strong><span>{status.overlayIp}</span></div>
        <div><strong>中继</strong><span>{status.relay}</span></div>
        <div><strong>路由模式</strong><span>{status.routeMode}</span></div>
        <div><strong>edge 状态</strong><span>{status.edgeState}</span></div>
        <div><strong>延迟</strong><span>{status.latency}</span></div>
      </div>
    </section>
  );
}
