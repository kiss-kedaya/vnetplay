import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { readSystemIdentityBridge } from "./lib/desktop/bridge";
import { resolveAppSettings, saveAppSettings, type AppSettings } from "./lib/settings/appSettings";
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
  settings: AppSettings;
  onSaveUsername: (username: string) => void;
  onResetUsername: () => void;
  onSaveSettings: (input: AppSettings) => void;
};

function renderPage(key: string, props: PageProps) {
  switch (key) {
    case "rooms":
      return <RoomsPage profile={props.profile} settings={props.settings} />;
    case "network":
      return <NetworkPage />;
    case "diagnostics":
      return <DiagnosticsPage />;
    case "settings":
      return <SettingsPage profile={props.profile} settings={props.settings} onSaveUsername={props.onSaveUsername} onResetUsername={props.onResetUsername} onSaveSettings={props.onSaveSettings} />;
    case "home":
    default:
      return <HomePage profile={props.profile} settings={props.settings} />;
  }
}

export function App() {
  const [activeKey, setActiveKey] = useState("home");
  const [profile, setProfile] = useState<UserProfile>({
    systemUsername: "player",
    username: "player",
    source: "system",
  });
  const [settings, setSettings] = useState<AppSettings>(resolveAppSettings());

  useEffect(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername));
    });
    setSettings(resolveAppSettings());
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

  function handleSaveSettings(input: AppSettings) {
    setSettings(saveAppSettings(input));
  }

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activeKey={activeKey} onSelect={setActiveKey} />
      <main className="main-shell">
        <Topbar title={activeItem.label} description={activeItem.description} username={profile.username} profileSource={profile.source} />
        {renderPage(activeKey, {
          profile,
          settings,
          onSaveUsername: handleSaveUsername,
          onResetUsername: handleResetUsername,
          onSaveSettings: handleSaveSettings,
        })}
      </main>
    </div>
  );
}

export default App;
