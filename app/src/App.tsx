import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { readSystemIdentityBridge } from "./lib/desktop/bridge";
import { resolveConnectionContext, saveConnectionContext, type ConnectionContext } from "./lib/runtime/connectionContext";
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
  connectionContext: ConnectionContext;
  onSaveUsername: (username: string) => void;
  onResetUsername: () => void;
  onSaveSettings: (input: AppSettings) => void;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
};

function renderPage(key: string, props: PageProps) {
  switch (key) {
    case "rooms":
      return <RoomsPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} />;
    case "network":
      return <NetworkPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onUpdateConnectionContext={props.onUpdateConnectionContext} />;
    case "diagnostics":
      return <DiagnosticsPage />;
    case "settings":
      return <SettingsPage profile={props.profile} settings={props.settings} onSaveUsername={props.onSaveUsername} onResetUsername={props.onResetUsername} onSaveSettings={props.onSaveSettings} />;
    case "home":
    default:
      return <HomePage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onUpdateConnectionContext={props.onUpdateConnectionContext} />;
  }
}

export function App() {
  const [activeKey, setActiveKey] = useState("home");
  const [profile, setProfile] = useState<UserProfile>({
    systemUsername: "player",
    username: "player",
    source: "system",
    machineId: "unknown-machine",
    machineLabel: "unknown",
  });
  const [settings, setSettings] = useState<AppSettings>(resolveAppSettings());
  const [connectionContext, setConnectionContext] = useState<ConnectionContext>(resolveConnectionContext());

  useEffect(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
    });
    setSettings(resolveAppSettings());
    setConnectionContext(resolveConnectionContext());
  }, []);

  const activeItem = useMemo(() => navItems.find((item) => item.key === activeKey) ?? navItems[0], [activeKey]);

  function handleSaveUsername(username: string) {
    setProfile((current) => saveUserOverride(username, current.systemUsername, current.machineId, current.machineLabel));
  }

  function handleResetUsername() {
    clearUserOverride();
    setProfile((current) => ({
      systemUsername: current.systemUsername,
      username: current.systemUsername,
      source: "system",
      machineId: current.machineId,
      machineLabel: current.machineLabel,
    }));
  }

  function handleSaveSettings(input: AppSettings) {
    setSettings(saveAppSettings(input));
  }

  function handleUpdateConnectionContext(context: ConnectionContext) {
    setConnectionContext(saveConnectionContext(context));
  }

  return (
    <div className="app-shell">
      <Sidebar items={navItems} activeKey={activeKey} onSelect={setActiveKey} />
      <main className="main-shell">
        <Topbar title={activeItem.label} description={activeItem.description} username={profile.username} profileSource={profile.source} />
        {renderPage(activeKey, {
          profile,
          settings,
          connectionContext,
          onSaveUsername: handleSaveUsername,
          onResetUsername: handleResetUsername,
          onSaveSettings: handleSaveSettings,
          onUpdateConnectionContext: handleUpdateConnectionContext,
        })}
      </main>
    </div>
  );
}

export default App;
