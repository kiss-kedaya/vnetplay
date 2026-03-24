import { useEffect, useRef, useState } from "react";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";
import {
  inspectNetworkBridge,
  startNetworkBridge,
  stopNetworkBridge,
  type DesktopCommandResult,
} from "../../lib/desktop/bridge";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { AppSettings } from "../../lib/settings/appSettings";

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

type NetworkPageProps = {
  profile: UserProfile;
  settings: AppSettings;
};

export function NetworkPage({ profile, settings }: NetworkPageProps) {
  const [status, setStatus] = useState<NetworkStatus>(fallbackStatus);
  const [commandResult, setCommandResult] = useState<DesktopCommandResult>(idleResult);
  const autoConnectTriggeredRef = useRef(false);

  useEffect(() => {
    fetchNetworkStatus().then(setStatus);
  }, [settings.serverBaseUrl]);

  async function handleStartNetwork(trigger: "manual" | "auto" = "manual") {
    const result = await startNetworkBridge({
      roomId: settings.defaultRoomName,
      username: profile.username,
    });

    setCommandResult({
      ...result,
      detail: trigger === "auto" ? `auto-connect: ${result.detail}` : result.detail,
    });
  }

  useEffect(() => {
    if (!settings.autoConnectOnLaunch || autoConnectTriggeredRef.current) {
      return;
    }

    autoConnectTriggeredRef.current = true;
    handleStartNetwork("auto");
  }, [settings.autoConnectOnLaunch, settings.defaultRoomName, profile.username]);

  return (
    <section className="card page-card network-page">
      <div className="section-header">
        <h2>网络状态</h2>
        <p>n2n edge、supernode 路径和当前链路质量都在这里收口展示。启动网络时会自动带当前用户名 {profile.username} 和默认房间 {settings.defaultRoomName}。</p>
      </div>
      <div className="card-subtle settings-block">
        <div className="settings-label">启动上下文预览</div>
        <div className="settings-value">{profile.username} @ {settings.defaultRoomName}</div>
        <div className="settings-meta">服务端：{settings.serverBaseUrl} · 自动连接：{settings.autoConnectOnLaunch ? "已开启" : "未开启"}</div>
      </div>
      <div className="network-actions">
        <button className="primary-button" type="button" onClick={() => handleStartNetwork("manual")}>
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
