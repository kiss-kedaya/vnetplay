import { AppIcon } from "../icons/AppIcon";
import type { NavItem } from "../../lib/ui/nav";

type SidebarProps = {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function Sidebar({ items, activeKey, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar card shell-sidebar-slim">
      <div className="brand shell-brand-slim">
        <div className="brand-mark"><AppIcon /></div>
        <div>
          <div className="brand-title">VNetPlay</div>
          <div className="brand-subtitle">房间联机</div>
        </div>
      </div>
      <nav className="nav-list shell-nav-slim">
        {items.map((item) => (
          <button
            key={item.key}
            className={item.key === activeKey ? "nav-item active" : "nav-item"}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
