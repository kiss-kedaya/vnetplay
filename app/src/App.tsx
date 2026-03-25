import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "./components/layout/Header";
import { readSystemIdentityBridge } from "./lib/desktop/bridge";
import { hasJoinedRoom, resolveConnectionContext, saveConnectionContext, type ConnectionContext } from "./lib/runtime/connectionContext";
import { resolveAppSettings, saveAppSettings, type AppSettings } from "./lib/settings/appSettings";
import { resolveUserProfile, type UserProfile } from "./lib/profile/userProfile";
import { getStoredQQLogin, type QQLoginState } from "./lib/auth/qqLogin";
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
      return <RoomsPage profile={props.profile} settings={props.settings} connectionContext={props.connectionContext} onSaveSettings={props.onSaveSettings} onOpenPage={props.onOpenPage} onRequestNetworkStart={props.onRequestNetworkStart} onUpdateConnectionContext={props.onUpdateConnectionContext} />;
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

  // 初始化
  useEffect(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
    });
    setSettings(resolveAppSettings());
    setConnectionContext(resolveConnectionContext());
  }, []);

  // 检测QQ登录回调
  useEffect(() => {
    const refresh = searchParams.get("refresh");
    if (refresh === "qq-login") {
      // 清除URL参数
      setSearchParams({});
      // 刷新QQ登录状态
      readSystemIdentityBridge().then((identity) => {
        setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
        setQQLogin(getStoredQQLogin());
      });
      // 跳转到设置页面
      setActiveKey("settings");
    }
  }, [searchParams, setSearchParams]);

  // 监听 Tauri QQ 登录成功事件
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI__" in window) {
      // @ts-ignore
      const tauri = window.__TAURI__;
      if (tauri?.event?.listen) {
        console.log("[App] Setting up QQ login event listener...");
        const unlistenPromise = tauri.event.listen("qq-login-success", (event: any) => {
          console.log("[App] QQ login success event received:", event);
          console.log("[App] Event payload:", event.payload);
          
          // 直接使用事件中的数据更新状态
          const { nickname, avatar, qqUid, accessToken } = event.payload || {};
          
          // 保存到 localStorage
          const loginData = {
            nickname,
            avatar,
            qqUid,
            accessToken,
            loggedAt: new Date().toISOString(),
          };
          localStorage.setItem("vnetplay.qq-login", JSON.stringify(loginData));
          console.log("[App] Saved login data to localStorage:", loginData);
          
          // 更新状态
          setQQLogin({
            isLoggedIn: true,
            nickname,
            avatar,
            qqUid,
          });
          
          // 更新 profile
          readSystemIdentityBridge().then((identity) => {
            setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
          });
          
          setActiveKey("settings");
          toast.success(`QQ登录成功！欢迎，${nickname || "用户"}`);
        });
        
        return () => {
          unlistenPromise.then((fn: () => void) => fn());
        };
      }
    }
  }, []);

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

  const refreshProfile = useCallback(() => {
    readSystemIdentityBridge().then((identity) => {
      setProfile(resolveUserProfile(identity.systemUsername, identity.machineId, identity.machineLabel));
      setQQLogin(getStoredQQLogin());
    });
  }, []);

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
          <div className="main-content-inner">
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
