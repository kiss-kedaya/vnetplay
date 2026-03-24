import { AppIcon } from "../icons/AppIcon";
import type { NavItem } from "../../lib/ui/nav";

type SidebarProps = {
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
};

export function Sidebar({ items, activeKey, onSelect }: SidebarProps) {
  const primaryItem = items.find((item) => item.key === "home") ?? items[0];
  const secondaryItems = items.filter((item) => item.key !== primaryItem.key);

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
        <button
          className={primaryItem.key === activeKey ? "nav-item active nav-item-primary" : "nav-item nav-item-primary"}
          onClick={() => onSelect(primaryItem.key)}
          type="button"
        >
          <span className="nav-label">{primaryItem.label}</span>
        </button>
      </nav>

      <div className="nav-group-label nav-group-label-muted">辅助工具</div>
      <nav className="nav-list shell-nav-slim nav-list-secondary nav-list-secondary-muted">
        {secondaryItems.map((item) => (
          <button
            key={item.key}
            className={item.key === activeKey ? "nav-item active nav-item-secondary" : "nav-item nav-item-secondary"}
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
