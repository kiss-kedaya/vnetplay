export type NavItem = {
  key: string;
  label: string;
  description: string;
  icon?: string;
};

export const navItems: NavItem[] = [
  { key: "home", label: "联机", description: "创建、加入与查看当前房间", icon: "home" },
  { key: "rooms", label: "房间", description: "房间成员与信息", icon: "rooms" },
  { key: "network", label: "网络", description: "连接与线路信息", icon: "network" },
  { key: "diagnostics", label: "排障", description: "日志与诊断", icon: "diagnostics" },
  { key: "guide", label: "教程", description: "安装与使用说明", icon: "guide" },
  { key: "settings", label: "设置", description: "服务器与昵称", icon: "settings" }
];
