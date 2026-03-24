import { InfoCard } from "../../components/cards/InfoCard";
import { StatusPill } from "../../components/status/StatusPill";
import { networkSummary } from "../../features/network/networkSummary";

export function HomePage() {
  return (
    <div className="page-grid">
      <InfoCard title="虚拟 IP" value={networkSummary.overlayIp} detail="进入房间后自动分配，适合 LAN 游戏直连。" footer={<StatusPill tone="online" text="在线" />} />
      <InfoCard title="中继路径" value={networkSummary.relay} detail="优先直连，失败后走你自己的服务器中转。" footer={<StatusPill tone="idle" text="智能选路" />} />
      <InfoCard title="链路质量" value={networkSummary.latency} detail={`当前丢包 ${networkSummary.packetLoss}，可继续做主动探测与切换。`} footer={<StatusPill tone="warning" text="可优化" />} />
    </div>
  );
}
