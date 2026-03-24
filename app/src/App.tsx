import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { readSystemIdentityBridge } from "./lib/desktop/bridge";
import { navItems } from "./lib/ui/nav";
import { HomePage } from "./pages/home/HomePage";
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { NetworkPage } from "./pages/network/NetworkPage";
import { DiagnosticsPage } from "./pages/diagnostics/DiagnosticsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { clearUserOverride, resolveUserProfile, saveUserOverride, type UserProfile } from "./lib/profile/userProfile";
import "./styles/index.css";

type PageProps = {
  profile: UserProfile;
  onSaveUsername: (username: string) => void;
  onResetUsername: () => void;
};

function renderPage(key: string, props: PageProps) {
  switch (key) {
    case "rooms":
      return <RoomsPage profile={props.profile} />;
    case "network":
      return <NetworkPage />;
    case "diagnostics":
      return <DiagnosticsPage />;
    case "settings":
      return <SettingsPage profile={props.profile} onSaveUsername={props.onSaveUsername} onResetUsername={props.onResetUsername} />;
    case "home":
    default:
      return <HomePage profile={props.profile} />;
  }
}

export function App() {
  const [activeKey, setActiveKey] = useState("home");
  const [profile, setProfile] = useState<UserProfile>({
    systemUsername: "player",
    username: "player",
    source: "system",
  });

  useEffect(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername));
    });
  }, []);

  const activeItem = useMemo(() => navItems.find((item) => item.key === activeKey) ?? navItems[0], [activeKey]);

  function handleSaveUsername(username: string) {
    setProfile((current) => saveUserOverride(username, current.systemUsername));
  }

  function handleResetUsername() {
    clearUserOverride();
    setProfile((current) => ({
      systemUsername: current.systemUsername,
      username: current.systemUsername,
      source: "system",
    }));
  }

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activeKey={activeKey} onSelect={setActiveKey} />
      <main className="main-shell">
        <Topbar title={activeItem.label} description={activeItem.description} username={profile.username} profileSource={profile.source} />
        {renderPage(activeKey, {
          profile,
          onSaveUsername: handleSaveUsername,
          onResetUsername: handleResetUsername,
        })}
      </main>
    </div>
  );
}

export default App;
