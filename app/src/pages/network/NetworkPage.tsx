import { useEffect, useMemo, useRef, useState } from "react";
import { fetchNetworkStatus, syncRecentAction, type NetworkStatus } from "../../lib/api/network";
import {
  inspectNetworkBridge,
  startNetworkBridge,
  stopNetworkBridge,
  type DesktopCommandResult,
  type InspectSnapshot,
} from "../../lib/desktop/bridge";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";

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

const idleInspect: InspectSnapshot = {
  roomId: "sts2-night-run",
  username: "player",
  community: "vnetplay-room",
  supernode: "127.0.0.1:7777",
  commandPreview: 'Command { std: "n2n-edge" "-c" "vnetplay-room" "-l" "127.0.0.1:7777" }',
  edgeState: "idle",
  lastCommand: "idle",
  runtimeStartedAt: "--",
  lastStartedAt: "--",
  lastStoppedAt: "--",
  lastPid: null,
  pidAlive: false,
  runtimeDurationSeconds: 0,
  runtimeDurationLabel: "idle",
};

const idleResult: DesktopCommandResult = {
  ok: true,
  detail: "等待执行桌面命令",
  pid: null,
  inspect: idleInspect,
};

type NetworkPageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

export function NetworkPage({ profile, settings, connectionContext, onUpdateConnectionContext }: NetworkPageProps) {
  const [status, setStatus] = useState<NetworkStatus>(fallbackStatus);
  const [commandResult, setCommandResult] = useState<DesktopCommandResult>(idleResult);
  const autoConnectTriggeredRef = useRef(false);

  const inspect = useMemo(() => commandResult.inspect ?? idleInspect, [commandResult.inspect]);

  async function refreshStatus() {
    const nextStatus = await fetchNetworkStatus();
    setStatus(nextStatus);
    return nextStatus;
  }

  async function syncActionToServer(action: string, result: DesktopCommandResult, source: string) {
    try {
      const recentAction = await syncRecentAction({
        action,
        roomId: settings.defaultRoomName,
        username: profile.username,
        detail: result.detail,
        success: result.ok,
        source,
        pid: result.pid ?? null,
      });

      setStatus((current) => ({
        ...current,
        recentAction,
      }));
    } catch {
      await refreshStatus();
    }
  }

  useEffect(() => {
    refreshStatus();
  }, [settings.serverBaseUrl]);

  async function handleStartNetwork(trigger: "manual" | "auto" = "manual") {
    const result = await startNetworkBridge({
      roomId: settings.defaultRoomName,
      username: profile.username,
      community: settings.defaultCommunity,
      supernode: settings.supernodeAddress,
    });

    const detail = trigger === "auto" ? `auto-connect: ${result.detail}` : result.detail;
    const finalResult = {
      ...result,
      detail,
    };
    setCommandResult(finalResult);
    await syncActionToServer(trigger === "auto" ? "desktop-auto-start" : "desktop-start", finalResult, trigger === "auto" ? "desktop-auto" : "desktop-manual");
    onUpdateConnectionContext({
      roomId: settings.defaultRoomName,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: result.ok,
      detail,
      pid: result.pid ?? null,
      source: trigger === "auto" ? "auto-start" : "manual-start",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: finalResult.inspect?.runtimeDurationLabel ?? "idle",
    });
  }

  async function handleStopNetwork() {
    const result = await stopNetworkBridge();
    setCommandResult(result);
    await syncActionToServer("desktop-stop", result, "desktop-manual");
    onUpdateConnectionContext({
      roomId: settings.defaultRoomName,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: result.ok,
      detail: result.detail,
      pid: result.pid ?? null,
      source: "stop",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: result.inspect?.runtimeDurationLabel ?? "idle",
    });
  }

  async function handleInspectNetwork() {
    const result = await inspectNetworkBridge();
    setCommandResult(result);
    await syncActionToServer("desktop-inspect", result, "desktop-manual");
    onUpdateConnectionContext({
      roomId: settings.defaultRoomName,
      username: profile.username,
      serverBaseUrl: settings.serverBaseUrl,
      success: result.ok,
      detail: result.detail,
      pid: result.pid ?? null,
      source: "inspect",
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      runtimeDurationLabel: result.inspect?.runtimeDurationLabel ?? "idle",
    });
  }

  useEffect(() => {
    if (!settings.autoConnectOnLaunch || autoConnectTriggeredRef.current) {
      return;
    }

    autoConnectTriggeredRef.current = true;
    handleStartNetwork("auto");
  }, [settings.autoConnectOnLaunch, settings.defaultRoomName, settings.defaultCommunity, settings.supernodeAddress, profile.username]);

  return (
    <section className="card page-card network-page">
      <div className="section-header">
        <h2>网络状态</h2>
        <p>n2n edge、supernode 路径和当前链路质量都在这里收口展示。启动网络时会自动带当前用户名 {profile.username}、默认房间 {settings.defaultRoomName}、community {settings.defaultCommunity} 和 supernode {settings.supernodeAddress}。</p>
      </div>
      <div className="card-subtle settings-block">
        <div className="settings-label">启动上下文预览</div>
        <div className="settings-value">{profile.username} @ {settings.defaultRoomName}</div>
        <div className="settings-meta">Community：{settings.defaultCommunity} · Supernode：{settings.supernodeAddress}</div>
        <div className="settings-meta">服务端：{settings.serverBaseUrl} · 自动连接：{settings.autoConnectOnLaunch ? "已开启" : "未开启"}</div>
      </div>
      <div className="network-actions">
        <button className="primary-button" type="button" onClick={() => handleStartNetwork("manual")}>
          启动网络
        </button>
        <button className="ghost-button" type="button" onClick={handleStopNetwork}>
          停止网络
        </button>
        <button className="ghost-button" type="button" onClick={handleInspectNetwork}>
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
      <div className="card-subtle settings-block">
        <div className="settings-label">桌面 inspect 结果</div>
        <div className="key-value-grid">
          <div><strong>房间</strong><span>{inspect.roomId}</span></div>
          <div><strong>用户名</strong><span>{inspect.username}</span></div>
          <div><strong>Community</strong><span>{inspect.community}</span></div>
          <div><strong>Supernode</strong><span>{inspect.supernode}</span></div>
          <div><strong>edge 状态</strong><span>{inspect.edgeState}</span></div>
          <div><strong>最后命令</strong><span>{inspect.lastCommand}</span></div>
          <div><strong>Runtime 启动</strong><span>{inspect.runtimeStartedAt}</span></div>
          <div><strong>最近启动</strong><span>{inspect.lastStartedAt}</span></div>
          <div><strong>最近停止</strong><span>{inspect.lastStoppedAt}</span></div>
          <div><strong>最近 PID</strong><span>{inspect.lastPid ?? "n/a"}</span></div>
          <div><strong>PID 存活</strong><span>{inspect.pidAlive ? "alive" : "stale"}</span></div>
          <div><strong>运行时长</strong><span>{inspect.runtimeDurationLabel}</span></div>
        </div>
        <div className="command-log">
          <div className="command-log-label">命令预览</div>
          <div className="command-log-detail">{inspect.commandPreview}</div>
        </div>
      </div>
      <div className="command-log card-subtle">
        <div className="command-log-label">桌面命令结果</div>
        <div className="command-log-detail">{commandResult.detail}</div>
        <div className="command-log-meta">状态: {commandResult.ok ? "success" : "error"} | PID: {commandResult.pid ?? "n/a"} | 运行时长: {inspect.runtimeDurationLabel}</div>
      </div>
      <div className="card-subtle settings-block">
        <div className="settings-label">服务端 recent action</div>
        <div className="key-value-grid">
          <div><strong>动作</strong><span>{status.recentAction.action}</span></div>
          <div><strong>房间</strong><span>{status.recentAction.roomId}</span></div>
          <div><strong>用户</strong><span>{status.recentAction.username}</span></div>
          <div><strong>来源</strong><span>{status.recentAction.source}</span></div>
          <div><strong>PID</strong><span>{status.recentAction.pid ?? "n/a"}</span></div>
          <div><strong>时间</strong><span>{status.recentAction.updatedAt}</span></div>
          <div><strong>状态</strong><span>{status.recentAction.success ? "success" : "error"}</span></div>
          <div><strong>当前连接记录</strong><span>{connectionContext.roomId}</span></div>
        </div>
        <div className="command-log">
          <div className="command-log-label">服务端 recent action 详情</div>
          <div className="command-log-detail">{status.recentAction.detail}</div>
        </div>
      </div>
    </section>
  );
}
