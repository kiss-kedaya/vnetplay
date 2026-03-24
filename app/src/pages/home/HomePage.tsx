import { useEffect, useMemo, useState } from "react";
import { InfoCard } from "../../components/cards/InfoCard";
import { StatusPill } from "../../components/status/StatusPill";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/api/dashboard";
import { fetchNetworkStatus, type NetworkStatus } from "../../lib/api/network";
import { createRoom, joinRoom } from "../../lib/api/rooms";
import type { UserProfile } from "../../lib/profile/userProfile";
import type { ConnectionContext } from "../../lib/runtime/connectionContext";
import type { AppSettings } from "../../lib/settings/appSettings";
import { defaultDashboardSummary } from "../../features/network/networkSummary";

type HomePageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

const fallbackServerStatus: NetworkStatus = {
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

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function HomePage({ profile, settings, connectionContext, onUpdateConnectionContext }: HomePageProps) {
  const [summary, setSummary] = useState<DashboardSummary>(defaultDashboardSummary);
  const [serverStatus, setServerStatus] = useState<NetworkStatus>(fallbackServerStatus);
  const [feedback, setFeedback] = useState("可以直接快速创建默认房间，或快速加入当前活跃房间。");

  const mismatchWarning = useMemo(() => {
    const serverAction = serverStatus.recentAction;
    const isComparableServerAction = serverAction.action.startsWith("desktop-");

    if (!isComparableServerAction) {
      return null;
    }

    const roomMismatch = connectionContext.roomId !== serverAction.roomId;
    const userMismatch = connectionContext.username !== serverAction.username;
    const statusMismatch = connectionContext.success !== serverAction.success;

    if (!roomMismatch && !userMismatch && !statusMismatch) {
      return null;
    }

    const reasons = [
      roomMismatch ? `房间不一致（本地 ${connectionContext.roomId} / 服务端 ${serverAction.roomId}）` : null,
      userMismatch ? `用户不一致（本地 ${connectionContext.username} / 服务端 ${serverAction.username}）` : null,
      statusMismatch ? `执行状态不一致（本地 ${connectionContext.success ? "success" : "error"} / 服务端 ${serverAction.success ? "success" : "error"}）` : null,
    ].filter(Boolean);

    return reasons.join("；");
  }, [connectionContext, serverStatus.recentAction]);

  async function refreshSummary() {
    const [nextSummary, nextStatus] = await Promise.all([fetchDashboardSummary(), fetchNetworkStatus()]);
    setSummary(nextSummary);
    setServerStatus(nextStatus);
    return nextSummary;
  }

  useEffect(() => {
    refreshSummary();
  }, [settings.serverBaseUrl]);

  async function handleQuickCreate() {
    try {
      const room = await createRoom({
        roomId: settings.defaultRoomName,
        username: profile.username,
        game: "Minecraft",
        mode: "LAN Overlay",
      });
      await refreshSummary();
      const detail = `已快速创建 ${room.roomId}，当前玩家 ${profile.username} 已进入房间。`;
      setFeedback(detail);
      onUpdateConnectionContext({
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: settings.serverBaseUrl,
        success: true,
        detail,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      });
    } catch (error) {
      const detail = `快速创建失败：${errorDetail(error)}`;
      setFeedback(detail);
      onUpdateConnectionContext({
        roomId: settings.defaultRoomName,
        username: profile.username,
        serverBaseUrl: settings.serverBaseUrl,
        success: false,
        detail,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      });
    }
  }

  async function handleQuickJoin() {
    try {
      const room = await joinRoom({
        roomId: summary.activeRoom,
        username: profile.username,
      });
      await refreshSummary();
      const detail = `已快速加入 ${room.roomId}，当前成员 ${room.participants.join(" / ")}。`;
      setFeedback(detail);
      onUpdateConnectionContext({
        roomId: room.roomId,
        username: profile.username,
        serverBaseUrl: settings.serverBaseUrl,
        success: true,
        detail,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      });
    } catch (error) {
      const detail = `快速加入失败：${errorDetail(error)}`;
      setFeedback(detail);
      onUpdateConnectionContext({
        roomId: summary.activeRoom,
        username: profile.username,
        serverBaseUrl: settings.serverBaseUrl,
        success: false,
        detail,
        pid: null,
        source: "manual-start",
        updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      });
    }
  }

  return (
    <div className="page-grid home-grid">
      <InfoCard title="当前玩家" value={profile.username} detail={`启动时默认读取系统用户名 ${profile.systemUsername}，可在设置页随时修改。`} footer={<StatusPill tone="online" text={profile.source === "system" ? "系统默认" : "已自定义"} />} />
      <InfoCard title="虚拟 IP" value={summary.overlayIp} detail="进入房间后自动分配，适合 LAN 游戏直连。" footer={<StatusPill tone="online" text="在线" />} />
      <InfoCard title="中继路径" value={summary.relay} detail={`当前房间 ${summary.activeRoom}，已连接 ${summary.roomMembers} 个成员。`} footer={<StatusPill tone="idle" text="智能选路" />} />
      <InfoCard title="链路质量" value={summary.latency} detail={`当前丢包 ${summary.packetLoss}，支持 ${summary.supportedGames.join(" / ")}。`} footer={<StatusPill tone="warning" text="可优化" />} />

      <section className="card page-card quick-actions-card">
        <div className="section-header">
          <h2>快速操作</h2>
          <p>直接使用当前用户名、服务端地址和默认房间名，减少切页操作。</p>
        </div>
        <div className="rooms-actions-grid">
          <div className="card-subtle settings-block">
            <div className="settings-label">快速创建默认房间</div>
            <div className="settings-value">{settings.defaultRoomName}</div>
            <div className="settings-meta">服务端：{settings.serverBaseUrl}</div>
            <button className="primary-button" type="button" onClick={handleQuickCreate}>创建并加入</button>
          </div>
          <div className="card-subtle settings-block">
            <div className="settings-label">快速加入活跃房间</div>
            <div className="settings-value">{summary.activeRoom}</div>
            <div className="settings-meta">当前玩家：{profile.username}</div>
            <button className="ghost-button" type="button" onClick={handleQuickJoin}>加入当前房间</button>
          </div>
        </div>
        <div className="command-log card-subtle">
          <div className="command-log-label">快速操作结果</div>
          <div className="command-log-detail">{feedback}</div>
        </div>
      </section>

      <section className="card page-card quick-actions-card">
        <div className="section-header">
          <h2>最近一次连接上下文</h2>
          <p>优先展示服务端侧最近动作，同时保留本地桌面最近执行结果，方便判断当前状态是否一致。</p>
        </div>
        {mismatchWarning ? (
          <div className="mismatch-banner">
            <div className="mismatch-banner-title">检测到本地与服务端状态不一致</div>
            <div className="mismatch-banner-detail">{mismatchWarning}</div>
          </div>
        ) : null}
        <div className="key-value-grid">
          <div><strong>服务端动作</strong><span>{serverStatus.recentAction.action}</span></div>
          <div><strong>服务端房间</strong><span>{serverStatus.recentAction.roomId}</span></div>
          <div><strong>服务端用户</strong><span>{serverStatus.recentAction.username}</span></div>
          <div><strong>服务端时间</strong><span>{serverStatus.recentAction.updatedAt}</span></div>
          <div><strong>服务端来源</strong><span>{serverStatus.recentAction.source}</span></div>
          <div><strong>本地状态</strong><span>{connectionContext.success ? "success" : "error"}</span></div>
        </div>
        <div className="command-log card-subtle">
          <div className="command-log-label">服务端最近结果</div>
          <div className="command-log-detail">{serverStatus.recentAction.detail}</div>
          <div className="command-log-meta">PID: {serverStatus.recentAction.pid ?? "n/a"} | 最近 relay: {serverStatus.relay} | edge: {serverStatus.edgeState}</div>
        </div>
        <div className="command-log card-subtle">
          <div className="command-log-label">本地最近结果</div>
          <div className="command-log-detail">{connectionContext.detail}</div>
          <div className="command-log-meta">PID: {connectionContext.pid ?? "n/a"} | 服务端：{connectionContext.serverBaseUrl}</div>
        </div>
      </section>
    </div>
  );
}
