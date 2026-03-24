import { useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { navItems } from "./lib/ui/nav";
import { HomePage } from "./pages/home/HomePage";
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { NetworkPage } from "./pages/network/NetworkPage";
import { DiagnosticsPage } from "./pages/diagnostics/DiagnosticsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import "./styles/index.css";

function renderPage(key: string) {
  switch (key) {
    case "rooms":
      return <RoomsPage />;
    case "network":
      return <NetworkPage />;
    case "diagnostics":
      return <DiagnosticsPage />;
    case "settings":
      return <SettingsPage />;
    case "home":
    default:
      return <HomePage />;
  }
}

export function App() {
  const [activeKey, setActiveKey] = useState("home");
  const activeItem = useMemo(() => navItems.find((item) => item.key === activeKey) ?? navItems[0], [activeKey]);

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activeKey={activeKey} onSelect={setActiveKey} />
      <main className="main-shell">
        <Topbar title={activeItem.label} description={activeItem.description} />
        {renderPage(activeKey)}
      </main>
    </div>
  );
}

export default App;
