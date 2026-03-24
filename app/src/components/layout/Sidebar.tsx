import { AppIcon } from "../icons/AppIcon";
import type { NavItem } from "../../lib/ui/nav";

type SidebarProps = {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function Sidebar({ items, activeKey, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar card">
      <div className="brand">
        <div className="brand-mark"><AppIcon /></div>
        <div>
          <div className="brand-title">VNetPlay</div>
          <div className="brand-subtitle">Rust + Tauri LAN 平台</div>
        </div>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.key}
            className={item.key === activeKey ? "nav-item active" : "nav-item"}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <span className="nav-label">{item.label}</span>
            <span className="nav-description">{item.description}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
