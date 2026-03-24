import { useEffect, useState } from "react";
import { InfoCard } from "../../components/cards/InfoCard";
import { StatusPill } from "../../components/status/StatusPill";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/api/dashboard";
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

export function HomePage({ profile, settings, connectionContext, onUpdateConnectionContext }: HomePageProps) {
  const [summary, setSummary] = useState<DashboardSummary>(defaultDashboardSummary);
  const [feedback, setFeedback] = useState("可以直接快速创建默认房间，或快速加入当前活跃房间。");

  async function refreshSummary() {
    const nextSummary = await fetchDashboardSummary();
    setSummary(nextSummary);
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
    } catch {
      const detail = `快速创建失败，请检查服务端 ${settings.serverBaseUrl}，或确认默认房间名 ${settings.defaultRoomName} 未重复。`;
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
    } catch {
      const detail = `快速加入失败，请确认活跃房间 ${summary.activeRoom} 存在且服务端 ${settings.serverBaseUrl} 可访问。`;
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
          <p>收口展示最近一次快速加入 / 快速创建 / 网络启动的执行结果，方便看当前状态。</p>
        </div>
        <div className="key-value-grid">
          <div><strong>最近房间</strong><span>{connectionContext.roomId}</span></div>
          <div><strong>最近用户</strong><span>{connectionContext.username}</span></div>
          <div><strong>服务端</strong><span>{connectionContext.serverBaseUrl}</span></div>
          <div><strong>来源</strong><span>{connectionContext.source}</span></div>
          <div><strong>时间</strong><span>{connectionContext.updatedAt}</span></div>
          <div><strong>状态</strong><span>{connectionContext.success ? "success" : "error"}</span></div>
        </div>
        <div className="command-log card-subtle">
          <div className="command-log-label">最近结果</div>
          <div className="command-log-detail">{connectionContext.detail}</div>
          <div className="command-log-meta">PID: {connectionContext.pid ?? "n/a"}</div>
        </div>
      </section>
    </div>
  );
}
