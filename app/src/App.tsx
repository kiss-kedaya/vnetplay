import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./components/layout/Header";
import { readSystemIdentityBridge } from "./lib/desktop/bridge";
import { hasJoinedRoom, resolveConnectionContext, saveConnectionContext, type ConnectionContext } from "./lib/runtime/connectionContext";
import { resolveAppSettings, saveAppSettings, type AppSettings } from "./lib/settings/appSettings";
import { resolveUserProfile, type UserProfile } from "./lib/profile/userProfile";
import {
  getStoredQQLogin,
  parseQQLoginSyncPayload,
  QQ_LOGIN_SYNC_CHANNEL,
  QQ_LOGIN_SYNC_STORAGE_KEY,
  saveQQLogin,
  type QQLoginResult,
  type QQLoginState,
  type QQLoginSyncPayload,
} from "./lib/auth/qqLogin";
import { initializeTheme, getStoredTheme, saveTheme, watchSystemTheme, type Theme } from "./lib/theme/theme";
import { navItems as baseNavItems } from "./lib/ui/nav";
import { HomePage } from "./pages/home/HomePage";
import { RoomsPage } from "./pages/rooms/RoomsPage";
import { NetworkPage } from "./pages/network/NetworkPage";
import { DiagnosticsPage } from "./pages/diagnostics/DiagnosticsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { GuidePage } from "./pages/guide/GuidePage";

type NetworkStartRequest = {
  id: number;
  roomId: string;
  serverBaseUrl: string;
  mode: "resume";
};

type PageProps = {
  profile: UserProfile;
  settings: AppSettings;
  connectionContext: ConnectionContext;
  qqLogin: QQLoginState;
  onSaveSettings: (input: Partial<AppSettings>) => void;
  onUpdateConnectionContext: (context: ConnectionContext) => void;
  onOpenPage: (key: string) => void;
  onRequestNetworkStart: (input: Omit<NetworkStartRequest, "id">) => void;
  networkStartRequest: NetworkStartRequest | null;
  onConsumeNetworkStartRequest: (id: number) => void;
  onQQLoginChange: () => void;
};

function renderPage(key: string, props: PageProps) {
  switch (key) {
    case "rooms":
      return <RoomsPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onOpenPage={props.onOpenPage} onRequestNetworkStart={props.onRequestNetworkStart} onUpdateConnectionContext={props.onUpdateConnectionContext} />;
    case "network":
      return <NetworkPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onUpdateConnectionContext={props.onUpdateConnectionContext} startRequest={props.networkStartRequest} onConsumeStartRequest={props.onConsumeNetworkStartRequest} />;
    case "diagnostics":
      return <DiagnosticsPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} />;
    case "settings":
      return <SettingsPage profile={props.profile} settings={props.settings} onSaveSettings={props.onSaveSettings} qqLogin={props.qqLogin} onQQLoginChange={props.onQQLoginChange} />;
    case "guide":
      return <GuidePage />;
    case "home":
    default:
      return <HomePage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onUpdateConnectionContext={props.onUpdateConnectionContext} onSaveSettings={props.onSaveSettings} onOpenPage={props.onOpenPage} onRequestNetworkStart={props.onRequestNetworkStart} />;
  }
}

export function App() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeKey, setActiveKey] = useState("home");
  const [theme, setTheme] = useState<Theme>(() => initializeTheme());
  const [profile, setProfile] = useState<UserProfile>({
    systemUsername: "player",
    username: "player",
    source: "system",
    machineId: "unknown-machine",
    machineLabel: "unknown",
  });
  const [settings, setSettings] = useState<AppSettings>(resolveAppSettings());
  const [connectionContext, setConnectionContext] = useState<ConnectionContext>(resolveConnectionContext());
  const [networkStartRequest, setNetworkStartRequest] = useState<NetworkStartRequest | null>(null);
  const [qqLogin, setQQLogin] = useState<QQLoginState>(getStoredQQLogin());
  const lastQQLoginSyncRef = useRef("");

  const refreshProfile = useCallback((options?: { silent?: boolean; syncId?: string; nickname?: string | null }) => {
    const storedLogin = getStoredQQLogin();

    if (options?.syncId) {
      if (lastQQLoginSyncRef.current === options.syncId) {
        return;
      }
      lastQQLoginSyncRef.current = options.syncId;
    }

    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
      setQQLogin(storedLogin);
    });

    if (storedLogin.isLoggedIn) {
      setActiveKey("settings");
      if (!options?.silent) {
        toast.success(`QQ登录成功！欢迎，${options?.nickname || storedLogin.nickname || "用户"}`);
      }
    }
  }, []);

  const handleQQLoginSync = useCallback((payload?: Partial<QQLoginSyncPayload> | Partial<QQLoginResult>, options?: { silent?: boolean }) => {
    const storedLogin = getStoredQQLogin();
    if (!storedLogin.isLoggedIn) {
      return;
    }

    const syncId = typeof payload?.syncId === "string"
      ? payload.syncId
      : `${storedLogin.qqUid ?? storedLogin.nickname ?? "qq"}-stored`;

    refreshProfile({
      silent: options?.silent,
      syncId,
      nickname: typeof payload?.nickname === "string" ? payload.nickname : storedLogin.nickname,
    });
  }, [refreshProfile]);

  useEffect(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
    });
    setSettings(resolveAppSettings());
    setConnectionContext(resolveConnectionContext());
  }, []);

  useEffect(() => {
    const refresh = searchParams.get("refresh");
    if (refresh === "qq-login") {
      setSearchParams({});
      handleQQLoginSync({ syncId: `query-${Date.now()}` }, { silent: true });
    }
  }, [searchParams, setSearchParams, handleQQLoginSync]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== QQ_LOGIN_SYNC_STORAGE_KEY) {
        return;
      }

      const payload = parseQQLoginSyncPayload(event.newValue);
      if (payload) {
        handleQQLoginSync(payload);
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "qq-login-success") {
        return;
      }

      const payload = event.data?.payload as Partial<QQLoginSyncPayload> | undefined;
      handleQQLoginSync(payload);
    };

    const onFocus = () => {
      const storedLogin = getStoredQQLogin();
      if (storedLogin.isLoggedIn && storedLogin.qqUid !== qqLogin.qqUid) {
        handleQQLoginSync({ syncId: `focus-${storedLogin.qqUid ?? Date.now()}` }, { silent: true });
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("message", onMessage);
    window.addEventListener("focus", onFocus);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(QQ_LOGIN_SYNC_CHANNEL);
      channel.onmessage = (event: MessageEvent<QQLoginSyncPayload>) => {
        handleQQLoginSync(event.data);
      };
    }

    if (typeof window !== "undefined" && "__TAURI__" in window) {
      const tauri = window.__TAURI__;
      if (tauri?.event?.listen) {
        const unlistenPromise = tauri.event.listen("qq-login-success", (event: { payload?: unknown }) => {
          const payload = event.payload as (QQLoginResult & Partial<QQLoginSyncPayload>) | undefined;
          if (!payload?.success) {
            return;
          }

          saveQQLogin(payload);
          handleQQLoginSync(payload);
        });
        
        return () => {
          window.removeEventListener("storage", onStorage);
          window.removeEventListener("message", onMessage);
          window.removeEventListener("focus", onFocus);
          channel?.close();
          unlistenPromise.then((fn: () => void) => fn());
        };
      }
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onFocus);
      channel?.close();
    };
  }, [handleQQLoginSync, qqLogin.qqUid]);

  // 监听系统主题变化
  useEffect(() => {
    const unsubscribe = watchSystemTheme((systemTheme) => {
      if (getStoredTheme() === "system") {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(systemTheme);
      }
    });
    return unsubscribe;
  }, []);

  // 当连接状态变化时，自动切换页面
  useEffect(() => {
    const joinedRoom = hasJoinedRoom(connectionContext);
    if (joinedRoom && activeKey === "home") {
      setActiveKey("rooms");
    } else if (!joinedRoom && activeKey === "rooms") {
      setActiveKey("home");
    }
  }, [connectionContext, activeKey]);

  // 根据连接状态过滤导航项
  const visibleNavItems = useMemo(() => {
    const joinedRoom = hasJoinedRoom(connectionContext);
    return baseNavItems
      .filter((item) => {
        if (item.key === "rooms") return joinedRoom;
        if (item.key === "home") return !joinedRoom;
        return true;
      })
      .map(({ key, label }) => ({ key, label }));
  }, [connectionContext]);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  }, []);

  function handleSaveSettings(input: Partial<AppSettings>) {
    setSettings(saveAppSettings(input));
  }

  function handleUpdateConnectionContext(context: ConnectionContext) {
    setConnectionContext(saveConnectionContext(context));
  }

  function handleRequestNetworkStart(input: Omit<NetworkStartRequest, "id">) {
    setNetworkStartRequest({
      id: Date.now(),
      roomId: input.roomId,
      serverBaseUrl: input.serverBaseUrl,
      mode: input.mode,
    });
    setActiveKey("network");
  }

  function handleConsumeNetworkStartRequest(id: number) {
    setNetworkStartRequest((current) => (current?.id === id ? null : current));
  }

  const contentLayoutClass = useMemo(() => {
    if (activeKey === "home" || activeKey === "settings") {
      return "main-content-inner main-content-inner--compact";
    }

    if (activeKey === "guide") {
      return "main-content-inner main-content-inner--guide";
    }

    return "main-content-inner";
  }, [activeKey]);

  return (
    <TooltipProvider>
      <div className="app-shell">
        <Header
          navItems={visibleNavItems}
          activeKey={activeKey}
          onSelectNav={setActiveKey}
          theme={theme}
          onThemeChange={handleThemeChange}
          profile={profile}
        />
        
        <main className="main-content">
          <div className={contentLayoutClass}>
            {renderPage(activeKey, {
              profile,
              settings,
              connectionContext,
              qqLogin,
              onSaveSettings: handleSaveSettings,
              onUpdateConnectionContext: handleUpdateConnectionContext,
              onOpenPage: setActiveKey,
              onRequestNetworkStart: handleRequestNetworkStart,
              networkStartRequest,
              onConsumeNetworkStartRequest: handleConsumeNetworkStartRequest,
              onQQLoginChange: refreshProfile,
            })}
          </div>
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </TooltipProvider>
  );
}

export default App;
