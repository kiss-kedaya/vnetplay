import { useEffect, useState } from "react";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";
import {
  inspectNetworkBridge,
  startNetworkBridge,
  stopNetworkBridge,
  type DesktopCommandResult,
} from "../../lib/desktop/bridge";

const fallbackStatus: NetworkStatus = {
  overlayIp: "10.24.8.12",
  relay: "Tokyo Relay / VPS",
  routeMode: "relay-preferred",
  edgeState: "running",
  latency: "32 ms",
};

const idleResult: DesktopCommandResult = {
  ok: true,
  detail: "等待执行桌面命令",
  pid: null,
};

export function NetworkPage() {
  const [status, setStatus] = useState<NetworkStatus>(fallbackStatus);
  const [commandResult, setCommandResult] = useState<DesktopCommandResult>(idleResult);

  useEffect(() => {
    fetchNetworkStatus().then(setStatus);
  }, []);

  return (
    <section className="card page-card">
      <div className="section-header">
        <h2>网络状态</h2>
        <p>n2n edge、supernode 路径和当前链路质量都在这里收口展示。</p>
      </div>
      <div className="network-actions">
        <button className="primary-button" type="button" onClick={() => startNetworkBridge().then(setCommandResult)}>
          启动网络
        </button>
        <button className="ghost-button" type="button" onClick={() => stopNetworkBridge().then(setCommandResult)}>
          停止网络
        </button>
        <button className="ghost-button" type="button" onClick={() => inspectNetworkBridge().then(setCommandResult)}>
          检查命令
        </button>
      </div>
      <div className="key-value-grid">
        <div><strong>虚拟 IP</strong><span>{status.overlayIp}</span></div>
        <div><strong>中继</strong><span>{status.relay}</span></div>
        <div><strong>路由模式</strong><span>{status.routeMode}</span></div>
        <div><strong>edge 状态</strong><span>{status.edgeState}</span></div>
        <div><strong>延迟</strong><span>{status.latency}</span></div>
      </div>
      <div className="command-log card-subtle">
        <div className="command-log-label">桌面命令结果</div>
        <div className="command-log-detail">{commandResult.detail}</div>
        <div className="command-log-meta">状态: {commandResult.ok ? "success" : "error"} | PID: {commandResult.pid ?? "n/a"}</div>
      </div>
    </section>
  );
}
