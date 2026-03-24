export type NavItem = {
  key: string;
  label: string;
  description: string;
};

export const navItems: NavItem[] = [
  { key: "home", label: "概览", description: "网络状态与节点摘要" },
  { key: "rooms", label: "房间", description: "创建、加入与管理房间" },
  { key: "network", label: "网络", description: "虚拟局域网与路由信息" },
  { key: "diagnostics", label: "诊断", description: "日志、延迟与异常排查" },
  { key: "settings", label: "设置", description: "客户端、服务器与游戏偏好" }
];
