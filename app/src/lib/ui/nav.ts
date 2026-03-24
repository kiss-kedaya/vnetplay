export type NavItem = {
  key: string;
  label: string;
  description: string;
};

export const navItems: NavItem[] = [
  { key: "home", label: "联机", description: "创建或加入房间" },
  { key: "rooms", label: "房间", description: "查看服务器房间" },
  { key: "network", label: "网络", description: "连接与线路信息" },
  { key: "diagnostics", label: "排障", description: "日志与诊断" },
  { key: "settings", label: "设置", description: "服务器与昵称" }
];
