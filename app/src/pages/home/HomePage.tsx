import { useEffect, useState } from "react";
import { InfoCard } from "../../components/cards/InfoCard";
import { StatusPill } from "../../components/status/StatusPill";
import { fetchDashboardSummary, type DashboardSummary } from "../../lib/api/dashboard";
import type { UserProfile } from "../../lib/profile/userProfile";
import { defaultDashboardSummary } from "../../features/network/networkSummary";

type HomePageProps = {
  profile: UserProfile;
};

export function HomePage({ profile }: HomePageProps) {
  const [summary, setSummary] = useState<DashboardSummary>(defaultDashboardSummary);

  useEffect(() => {
    fetchDashboardSummary().then(setSummary);
  }, []);

  return (
    <div className="page-grid">
      <InfoCard title="当前玩家" value={profile.username} detail={`启动时默认读取系统用户名 ${profile.systemUsername}，可在设置页随时修改。`} footer={<StatusPill tone="online" text={profile.source === "system" ? "系统默认" : "已自定义"} />} />
      <InfoCard title="虚拟 IP" value={summary.overlayIp} detail="进入房间后自动分配，适合 LAN 游戏直连。" footer={<StatusPill tone="online" text="在线" />} />
      <InfoCard title="中继路径" value={summary.relay} detail={`当前房间 ${summary.activeRoom}，已连接 ${summary.roomMembers} 个成员。`} footer={<StatusPill tone="idle" text="智能选路" />} />
      <InfoCard title="链路质量" value={summary.latency} detail={`当前丢包 ${summary.packetLoss}，支持 ${summary.supportedGames.join(" / ")}。`} footer={<StatusPill tone="warning" text="可优化" />} />
    </div>
  );
}
